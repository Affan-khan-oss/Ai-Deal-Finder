import { NextResponse } from "next/server"
import { getMultiPlatformDeals } from "@/lib/platforms"

export async function POST(request) {
  try {
    const { product, maxPrice, location, urgency, sessionId } = await request.json()

    if (!product?.trim()) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 })
    }

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
    return NextResponse.json({ error: "Search failed", details: error.message }, { status: 500 })
  }
}

// GET helper so you can test in browser: /api/search?q=iphone+15
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || "iPhone 15"
  const maxPrice = searchParams.get("maxPrice") || "100000"
  const { deals, live, demo, comparedProducts } = await getMultiPlatformDeals(q, maxPrice)
  return NextResponse.json({
    query: q,
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
