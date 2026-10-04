import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
    const { email, sessionId, results } = await request.json()
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
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
      flatDeals = results
    } else if (results && typeof results === "object") {
      groups = Array.isArray(results.comparedProducts) ? results.comparedProducts : []
      flatDeals = Array.isArray(results.deals) ? results.deals : []
      insights = results.insights || {}
      searchParams = results.searchParams || {}
    }

    const productName = searchParams.product || results?.query || "your product"
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
              (p) => `
                <tr>
                  <td style="padding:8px;border:1px solid #ddd;">${esc(PLATFORM_LABELS[p.platform] || p.platform || "Store")}${p.seller ? `<br/><small style="color:#666;">${esc(p.seller)}</small>` : ""}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${esc(inr(p.price))}${p.originalPrice > p.price ? `<br/><small style="color:#888;"><s>${esc(inr(p.originalPrice))}</s></small>` : ""}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${esc(p.rating ?? "—")}</td>
                  <td style="padding:8px;border:1px solid #ddd;">${p.url ? `<a href="${esc(p.url)}">View deal</a>` : "—"}</td>
                </tr>
              `
            )
            .join("")
          return `
            <div style="margin:20px 0;padding:16px;border:1px solid #e5e5e5;border-radius:8px;">
              <h3 style="margin:0 0 4px 0;">${gi + 1}. ${esc(g.name || flatDeals[0]?.title || productName)}</h3>
              <p style="margin:4px 0;">
                <strong>Best price: ${esc(inr(bestPrice))}</strong> on ${esc(bestLabel)}
                ${g.mrp ? ` &nbsp; <small style="color:#666;"><s>${esc(inr(g.mrp))}</s></small>` : ""}
                ${g.rating ? ` &nbsp; <small>Rating: ${esc(g.rating)}/5</small>` : ""}
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
          (deal, index) => `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
              <td style="padding:8px;border:1px solid #ddd;">${esc(deal.title || deal.name || "Deal")}<br/><small style="color:#666;">${esc(PLATFORM_LABELS[deal.platform] || deal.platform || "")}</small></td>
              <td style="padding:8px;border:1px solid #ddd;">${esc(typeof deal.price === "number" ? inr(deal.price) : deal.price || "N/A")}</td>
              <td style="padding:8px;border:1px solid #ddd;">${deal.productUrl || deal.amazonUrl || deal.url ? `<a href="${esc(deal.productUrl || deal.amazonUrl || deal.url)}">View deal</a>` : "—"}</td>
            </tr>
          `
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
        <p>Found <strong>${groups.length || flatDeals.length}</strong> result(s) for "<strong>${esc(productName)}</strong>".</p>
        ${insights.bestPrice ? `<p>Lowest price: <strong>${esc(inr(insights.bestPrice))}</strong>${insights.bestPlatform ? ` on ${esc(PLATFORM_LABELS[insights.bestPlatform] || insights.bestPlatform)}` : ""}</p>` : ""}
        ${insights.maxSavings ? `<p>Max savings vs MRP: <strong>${esc(inr(insights.maxSavings))}</strong></p>` : ""}
      `
      : ""

    await transporter.sendMail({
      from: `"AI Deal Finder" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your AI Deal Finder Report - ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif;max-width:640px;">
          <h2>AI Deal Finder Report</h2>

          <p>Your deal search report is ready.</p>

          ${
            sessionId
              ? `<p><strong>Session ID:</strong> ${esc(sessionId)}</p>`
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
        details: error.message,
      },
      { status: 500 }
    )
  }
}