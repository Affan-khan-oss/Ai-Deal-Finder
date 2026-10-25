import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const MAX_RESULTS = 20
const MAX_NAME_LENGTH = 120
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const rateLimitStore = new Map()

const SAFE_URL_HOSTS = [
  "amazon.in",
  "flipkart.com",
  "meesho.com",
  "croma.com",
  "reliancedigital.in",
  "google.com",
  "google.co.in",
]

// Only allow https links to known shopping domains (and their subdomains).
function safeUrl(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return ""

  let url
  try {
    url = new URL(raw)
  } catch {
    return ""
  }

  if (url.protocol !== "https:") return ""

  const hostname = url.hostname.toLowerCase()
  const allowed = SAFE_URL_HOSTS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  )
  return allowed ? url.href : ""
}

function truncate(value, maxLength = MAX_NAME_LENGTH) {
  return String(value ?? "").slice(0, maxLength)
}

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
  const entry = rateLimitStore.get(ip)

  if (!entry || entry.resetAt <= now) {
    if (rateLimitStore.size >= 1000) {
      for (const [key, value] of rateLimitStore) {
        if (value.resetAt <= now) rateLimitStore.delete(key)
      }
    }
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) return true

  entry.count += 1
  return false
}

function inr(n) {
  const num = Number(n)
  if (n === null || n === undefined || isNaN(num)) return "N/A"
  return "₹" + num.toLocaleString("en-IN")
}

const PLATFORM_LABELS = {
  amazon: "Amazon.in",
  flipkart: "Flipkart",
  meesho: "Meesho",
  croma: "Croma",
  reliance: "Reliance",
  google: "Shopping",
}

export async function POST(request) {
  try {
    let payload
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }
    const { email, sessionId, results } = payload
    const normalizedEmail = typeof email === "string" ? email.trim() : ""
    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !EMAIL_REGEX.test(normalizedEmail)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    const clientIp = getClientIp(request)
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // --- Normalize results: frontend sends full object { comparedProducts, deals, insights, searchParams } ---
    // Old code did `Array.isArray(results) ? results : []` which always gave [] => "No deals found."
    let groups = []
    let flatDeals = []
    let insights = {}
    let searchParams = {}
    if (Array.isArray(results)) {
      flatDeals = results.slice(0, MAX_RESULTS)
    } else if (results && typeof results === "object") {
      groups = Array.isArray(results.comparedProducts)
        ? results.comparedProducts.slice(0, MAX_RESULTS)
        : []
      flatDeals = Array.isArray(results.deals)
        ? results.deals.slice(0, MAX_RESULTS)
        : []
      insights = results.insights || {}
      searchParams = results.searchParams || {}
    }

    const productName = truncate(
      searchParams.product || results?.query || "your product"
    )
    const hasDeals = groups.length > 0 || flatDeals.length > 0

    let dealsHtml = ""
    if (groups.length > 0) {
      dealsHtml = groups
        .map((g, gi) => {
          const platforms = [...(g.platforms || [])].sort((a, b) => (a.price || 0) - (b.price || 0))
          const bestPrice = g.bestPrice ?? platforms[0]?.price
          const bestPlatform = g.bestPlatform || platforms[0]?.platform || ""
          const bestLabel = PLATFORM_LABELS[bestPlatform] || bestPlatform || "Best"
          const platformRows = platforms
            .map(
              (p) => {
                const url = safeUrl(p.url)
                return `
                <tr>
                  <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(PLATFORM_LABELS[p.platform] || p.platform || "Store")}${p.seller ? `<br/><small style="color:#666;">${escapeHtml(p.seller)}</small>` : ""}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(inr(p.price))}${p.originalPrice > p.price ? `<br/><small style="color:#888;"><s>${escapeHtml(inr(p.originalPrice))}</s></small>` : ""}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(p.rating ?? "—")}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${url ? `<a href="${escapeHtml(url)}">View deal</a>` : "—"}</td>
                </tr>
              `
              }
            )
            .join("")
          return `
            <div style="margin:20px 0;padding:16px;border:1px solid #e5e5e5;border-radius:8px;">
              <h3 style="margin:0 0 4px 0;">${gi + 1}. ${escapeHtml(truncate(g.name || flatDeals[0]?.title || productName))}</h3>
              <p style="margin:4px 0;">
                <strong>Best price: ${escapeHtml(inr(bestPrice))}</strong> on ${escapeHtml(bestLabel)}
                ${g.mrp ? ` &nbsp; <small style="color:#666;"><s>${escapeHtml(inr(g.mrp))}</s></small>` : ""}
                ${g.rating ? ` &nbsp; <small>Rating: ${escapeHtml(g.rating)}/5</small>` : ""}
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:8px;">
                <thead>
                  <tr style="background:#f5f5f5;">
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Platform</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Price</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Rating</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Link</th>
                  </tr>
                </thead>
                <tbody>${platformRows}</tbody>
              </table>
            </div>
          `
        })
        .join("")
    } else if (flatDeals.length > 0) {
      const rows = flatDeals
        .map(
          (deal, index) => {
            const url = safeUrl(deal.productUrl || deal.amazonUrl || deal.url)
            return `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
              <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(truncate(deal.title || deal.name || "Deal"))}<br/><small style="color:#666;">${escapeHtml(PLATFORM_LABELS[deal.platform] || deal.platform || "")}</small></td>
              <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(typeof deal.price === "number" ? inr(deal.price) : deal.price || "N/A")}</td>
              <td style="padding:8px;border:1px solid #ddd;">${url ? `<a href="${escapeHtml(url)}">View deal</a>` : "—"}</td>
            </tr>
          `
          }
        )
        .join("")
      dealsHtml = `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">#</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Product</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Price</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Link</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    }

    const summaryHtml = hasDeals
      ? `
        <p>Found <strong>${groups.length || flatDeals.length}</strong> result(s) for "<strong>${escapeHtml(productName)}</strong>".</p>
        ${insights.bestPrice ? `<p>Lowest price: <strong>${escapeHtml(inr(insights.bestPrice))}</strong>${insights.bestPlatform ? ` on ${escapeHtml(PLATFORM_LABELS[insights.bestPlatform] || insights.bestPlatform)}` : ""}</p>` : ""}
        ${insights.maxSavings ? `<p>Max savings vs MRP: <strong>${escapeHtml(inr(insights.maxSavings))}</strong></p>` : ""}
      `
      : ""

    await transporter.sendMail({
      from: `"AI Deal Finder" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: `Your AI Deal Finder Report - ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif;max-width:640px;">
          <h2>AI Deal Finder Report</h2>

          <p>Your deal search report is ready.</p>

          ${
            sessionId
              ? `<p><strong>Session ID:</strong> ${escapeHtml(sessionId)}</p>`
              : ""
          }
          ${summaryHtml}
          ${
            hasDeals
              ? dealsHtml
              : "<p>No deals found.</p>"
          }
          <p>Thanks for using AI Deal Finder.</p>
        </div>
      `,
    })
    return NextResponse.json({
      message: "Deal report sent successfully!",
      success: true,
    })
  } catch (error) {
    console.error("Email API error:", error)
    return NextResponse.json(
      {
        error: "Failed to send email",
        ...(process.env.NODE_ENV !== "production"
          ? { details: error.message }
          : {}),
      },
      { status: 500 }
    )
  }
}