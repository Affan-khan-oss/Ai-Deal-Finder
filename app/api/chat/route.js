import { NextResponse } from "next/server";

// Groq (free tier, OpenAI-compatible API). Models are configurable from .env.local.
// If the main model is missing, rate-limited or errors, the fallback model is tried automatically.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM = `You are the shopping assistant inside AI Deal Finder, an Indian price comparison app.

You ONLY help with shopping: product information, comparing products, choosing between variants, buying advice, and prices on Amazon.in, Flipkart, Meesho, Croma and Reliance Digital.
If the user asks about anything else (coding, news, homework, poems, general chat), politely say you can only help with shopping and product questions, and invite a shopping question.

Rules:
- For any price, availability or seller question, call the search_products tool first. Never quote prices from memory.
- Only state prices and ratings that appear in the tool results. Prices are in INR (₹) and may differ slightly from the live seller page.
- If the tool returns nothing useful, say so honestly and suggest a more specific search.
- Keep answers short and practical. Mention the cheapest option, and flag low ratings or unusually low prices (possible refurbished or accessory listings).
- Search at most 2 times per answer. For vague requests like "best Motorola phone" or "good phone under 25k", search only the 1 or 2 most relevant models, then answer. Do not search for many models.
- Write plain text only. Do not use markdown symbols like ** or # or tables. Use short lines and the ₹ symbol for prices.
- Reply in the same language the user writes in (English, Hindi or Hinglish).`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search live prices for a product across Indian shopping sites. Use a specific product name, e.g. 'iPhone 15 128GB'.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Product name to search" } },
        required: ["query"],
      },
    },
  },
];

// ---- Save SerpApi credits: cache repeated searches for 1 hour (in memory) ----
const searchCache = new Map();
const CACHE_MS = 60 * 60 * 1000;

// ---- Simple per-IP rate limit: 15 chat requests per 10 minutes (in memory) ----
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 15;
}

// Calls your existing /api/search (POST { product, maxPrice }) and keeps only what the bot needs.
// Kept small on purpose: Groq's free tier limits tokens per minute.
async function searchProducts(query, origin) {
  const key = query.trim().toLowerCase();
  if (!key) return "No search query given.";

  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;

  try {
    const res = await fetch(`${origin}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // High maxPrice so the search never filters out expensive products.
      body: JSON.stringify({ product: query, maxPrice: "1000000" }),
    });
    if (!res.ok) return "Price search failed. Tell the user to try again.";
    const r = await res.json();

    const deals = (r.deals || []).slice(0, 6).map((d) => ({
      platform: d.platform,
      name: String(d.name || d.title || "").slice(0, 80),
      price: d.price,
      rating: d.rating,
    }));

    const data = JSON.stringify({
      note: r.demo
        ? "These are DEMO sample prices, not live. Tell the user clearly."
        : "Live prices in INR.",
      bestPlatform: r.insights?.bestPlatform,
      bestPrice: r.insights?.bestPrice,
      deals,
    });
    searchCache.set(key, { time: Date.now(), data });
    return data;
  } catch {
    return "Price search failed. Tell the user to try again.";
  }
}

const MAX_SEARCHES = 2; // per chat message, protects SerpApi credits

// Tries the main model first, then the fallback model if rate-limited or the server fails.
async function callGroq(messages, allowTools) {
  const models = [...new Set([MODEL, FALLBACK_MODEL])];
  let lastErr;

  for (const model of models) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS,
        tool_choice: allowTools ? "auto" : "none", // "none" forces a plain text answer
        max_tokens: 1500,
        temperature: 0.3,
        ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      }),
    });
    if (res.ok) return res.json();

    const text = await res.text();
    const err = new Error(`Groq ${res.status} (${model}): ${text.slice(0, 300)}`);
    err.status = res.status;
    lastErr = err;

    const retryable = res.status === 404 || res.status === 429 || res.status >= 500 || text.includes("tool_use_failed");
    if (!retryable) break;
  }
  throw lastErr;
}

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ reply: "Chat is not configured yet (missing GROQ_API_KEY)." });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ reply: "You're sending messages too fast. Please wait a few minutes." }, { status: 429 });
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Conversation must start with a user message, so drop the leading assistant greeting.
  const history = messages.slice(-10).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content).slice(0, 2000),
  }));
  while (history.length && history[0].role !== "user") history.shift();
  if (history.length === 0) return NextResponse.json({ error: "No user message" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const convo = [{ role: "system", content: SYSTEM }, ...history];
  let searchesUsed = 0;

  try {
    for (let round = 0; round < 4; round++) {
      const data = await callGroq(convo, searchesUsed < MAX_SEARCHES);
      const msg = data.choices?.[0]?.message;
      if (!msg) {
        return NextResponse.json({ reply: "I couldn't answer that. Try rephrasing your shopping question." });
      }

      const calls = msg.tool_calls || [];
      if (calls.length === 0) {
        return NextResponse.json({ reply: msg.content || "I couldn't answer that. Please try again." });
      }

      // Add the model's tool request, then our results for each call.
      convo.push({ role: "assistant", content: msg.content || "", tool_calls: calls });
      for (const call of calls) {
        let result;
        if (searchesUsed < MAX_SEARCHES) {
          searchesUsed++;
          let args = {};
          try {
            args = JSON.parse(call.function?.arguments || "{}");
          } catch {}
          result = await searchProducts(String(args.query || ""), origin);
        } else {
          result = "Search limit reached for this message. Answer using the results you already have.";
        }
        convo.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }
    return NextResponse.json({ reply: "I couldn't finish that. Try a more specific product name." });
  } catch (err) {
    console.error("chat error:", err.message);
    const busy = err.status === 429 || err.status >= 500;
    // Shows the real error in the chat while developing (hidden in production).
    const debug = process.env.NODE_ENV !== "production" ? `\n\n[debug: ${err.message}]` : "";
    return NextResponse.json(
      { reply: (busy ? "The assistant is busy right now. Please try again in a minute." : "Something went wrong. Please try again.") + debug },
      { status: busy ? 429 : 500 }
    );
  }
}