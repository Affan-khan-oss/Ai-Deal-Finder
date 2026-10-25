import { NextResponse } from "next/server"
import { getMultiPlatformDeals } from "@/lib/platforms"

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const rateLimitStore = new Map()

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim()
    if (firstIp) return firstIp
  }
  return "local"
}

function isRateLimited(ip) {
  const now = Date.now()
  const recent = (rateLimitStore.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  )

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, recent)
    return true
  }

  recent.push(now)
  rateLimitStore.set(ip, recent)

  if (rateLimitStore.size > 1000) {
    for (const [key, timestamps] of rateLimitStore) {
      if (
        timestamps.length === 0 ||
        now - timestamps[timestamps.length - 1] >= RATE_LIMIT_WINDOW_MS
      ) {
        rateLimitStore.delete(key)
      }
    }
  }

  return false
}

function validateProduct(value) {
  if (typeof value !== "string") return null
  const product = value.trim()
  if (product.length < 2 || product.length > 100) return null
  return product
}

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }
    const product = validateProduct(body?.product)

    if (!product) {
      return NextResponse.json(
        { error: "Please enter a valid product name" },
        { status: 400 }
      )
    }

    const clientIp = getClientIp(request)
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many searches. Please wait a few minutes." },
        { status: 429 }
      )
    }

    const { maxPrice, location, urgency, sessionId } = body || {}

    console.log("Search request:", { product, maxPrice, location, urgency, sessionId })

    // Real multi-platform fetch: SerpApi (Amazon.in + Flipkart + Meesho) + Flipkart Affiliate
    // Falls back to multi-platform demo mock when no API keys are set.
    const { deals, live, demo, sources, comparedProducts } = await getMultiPlatformDeals(product, maxPrice)

    const priced = deals.filter((d) => d.price > 0)
    const groups = comparedProducts || []
    const bestGroup = groups[0]
    const results = {
      sessionId,
      deals,
      comparedProducts: groups,
      live,
      demo: !!demo,
      sources: sources || [],
      currency: "INR",
      insights: {
        averagePrice: bestGroup ? bestGroup.bestPrice : 0,
        // average across groups' best prices
        maxSavings: groups.length > 0 ? Math.max(...groups.map((g) => g.savings || 0)) : 0,
        highestRating: deals.length > 0 ? Math.max(...deals.map((deal) => deal.rating || 0)) : 0,
        totalStock: deals.reduce((sum, deal) => sum + (deal.stock || 0), 0),
        bestPlatform: bestGroup?.bestPlatform || null,
        bestPrice: bestGroup?.bestPrice || 0,
        platformsCompared: [...new Set(deals.map((d) => d.platform))],
        productsCompared: groups.length,
      },
      searchParams: { product, maxPrice, location, urgency },
    }

    console.log(
      `Search done: ${deals.length} deals live=${live} demo=${!!demo} platforms=${results.insights.platformsCompared}`
    )
    return NextResponse.json(results)
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      {
        error: "Search failed",
        ...(process.env.NODE_ENV !== "production"
          ? { details: error.message }
          : {}),
      },
      { status: 500 }
    )
  }
}

// GET helper so you can test in browser: /api/search?q=iphone+15
export async function GET(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const product = validateProduct(
    searchParams.get("product") ?? searchParams.get("q") ?? "iPhone 15"
  )

  if (!product) {
    return NextResponse.json(
      { error: "Please enter a valid product name" },
      { status: 400 }
    )
  }

  const clientIp = getClientIp(request)
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a few minutes." },
      { status: 429 }
    )
  }

  const maxPrice = searchParams.get("maxPrice") || "100000"
  const { deals, live, demo, comparedProducts } = await getMultiPlatformDeals(product, maxPrice)
  return NextResponse.json({
    query: product,
    live,
    demo: !!demo,
    count: deals.length,
    groups: (comparedProducts || []).length,
    hasSerpApiKey: !!process.env.SERPAPI_KEY,
    hasFlipkartKeys: !!(process.env.FLIPKART_AFFILIATE_ID && process.env.FLIPKART_TOKEN),
    comparedProducts: (comparedProducts || []).slice(0, 2),
    hint: !process.env.SERPAPI_KEY
      ? "Add SERPAPI_KEY to .env to get real Amazon.in / Flipkart / Meesho prices. See .env.example"
      : "Live prices active",
  })
}
