// lib/platforms.js
// Unified multi-platform price fetcher + SAME-PRODUCT grouping
// 1 search -> 1 product group -> Flipkart / Amazon.in / Meesho prices side-by-side

const PLATFORM_META = {
  amazon: { name: "Amazon.in", color: "from-orange-500 to-yellow-500", short: "Amazon" },
  flipkart: { name: "Flipkart", color: "from-blue-500 to-yellow-400", short: "Flipkart" },
  meesho: { name: "Meesho", color: "from-pink-500 to-purple-500", short: "Meesho" },
  croma: { name: "Croma", color: "from-teal-500 to-green-500", short: "Croma" },
  reliance: { name: "Reliance Digital", color: "from-red-500 to-orange-500", short: "Reliance" },
  google: { name: "Google Shopping", color: "from-indigo-500 to-purple-500", short: "Shopping" },
}

function detectPlatform(source = "") {
  const s = source.toLowerCase()
  if (s.includes("amazon")) return "amazon"
  if (s.includes("flipkart")) return "flipkart"
  if (s.includes("meesho")) return "meesho"
  if (s.includes("croma")) return "croma"
  if (s.includes("reliance") || s.includes("jiomart")) return "reliance"
  return "google"
}

function parsePrice(str = "") {
  if (typeof str === "number") return str
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ""))
  return isNaN(n) ? 0 : n
}

// ---------- SAME-PRODUCT grouping ----------
function normalizeVariantKey(title = "") {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(flipkart|amazon|meesho|prime|f assured|budget|pick|retailnet|supplier|renewed|refurbished|prime|eligible|free|returns|delivery)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const storage = (clean.match(/(\d+)\s*gb/) || [])[0] || ""
  const words = clean.split(" ").filter(Boolean).slice(0, 5).join(" ")
  return `${words} ${storage}`.trim()
}

function groupDealsIntoProducts(deals) {
  const map = new Map()
  for (const d of deals) {
    if (!d.price || d.price <= 0) continue
    const key = normalizeVariantKey(d.title || d.name || "")
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(d)
  }
  const groups = []
  for (const [key, items] of map.entries()) {
    // Only keep groups that have 2+ platforms OR single strong group (for live single-source)
    // Sort platforms by price
    items.sort((a, b) => a.price - b.price)
    const best = items[0]
    const mrp = Math.max(...items.map((x) => x.originalPrice || x.price))
    // Prefer the most detailed title as group name
    const nameItem = [...items].sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0))[0]
    groups.push({
      id: key,
      name: nameItem.title,
      image: nameItem.image,
      specs: nameItem.specs || [],
      rating: Math.max(...items.map((x) => x.rating || 0)),
      mrp,
      platforms: items.map((x) => ({
        platform: x.platform,
        seller: x.seller,
        price: x.price,
        originalPrice: x.originalPrice,
        rating: x.rating,
        delivery: x.delivery,
        url: x.productUrl || x.amazonUrl,
        specialOffers: x.specialOffers || [],
      })),
      bestPrice: best.price,
      bestPlatform: best.platform,
      savings: mrp - best.price,
      priceDiff: items.length > 1 ? items[items.length - 1].price - best.price : 0,
      count: items.length,
    })
  }
  // Biggest groups (most platforms compared) first, then cheapest
  groups.sort((a, b) => b.count - a.count || a.bestPrice - b.bestPrice)
  return groups
}

// ---------- Realistic base prices for demo (matches Flipkart screenshot) ----------
function guessBasePrice(product) {
  const p = product.toLowerCase()
  if (p.includes("iphone 17")) {
    if (p.includes("128")) return { mrp: 94900, price: 89900 }
    return { mrp: 99900, price: 98900 } // matches screenshot: White 256GB ₹98,900
  }
  if (p.includes("iphone 15")) return { mrp: 79900, price: 69900 }
  if (p.includes("iphone 16")) return { mrp: 89900, price: 79900 }
  if (p.includes("samsung") && p.includes("s24")) return { mrp: 79999, price: 62999 }
  if (p.includes("macbook air m3")) return { mrp: 114900, price: 99900 }
  if (p.includes("sony") && p.includes("xm5")) return { mrp: 34990, price: 26990 }
  if (p.includes("jordan")) return { mrp: 21000, price: 18500 }
  return null
}

function buildSearchLinks(product) {
  const q = encodeURIComponent(product)
  const tag = process.env.AMAZON_TAG || "dealfinder-21"
  const mk = (platform, seller, url) => ({
    platform, seller, location: "India", title: `${product}`,
    price: 0, originalPrice: 0, rating: 0, stock: 0,
    delivery: "Check on site", condition: "New", score: 50,
    specialOffers: ["Live Price"], image: "/placeholder.svg?height=200&width=200",
    productUrl: url, amazonUrl: url, isSearchLink: true,
  })
  return [
    mk("amazon", "Amazon.in", `https://www.amazon.in/s?k=${q}&tag=${tag}`),
    mk("flipkart", "Flipkart", `https://www.flipkart.com/search?q=${q}`),
    mk("meesho", "Meesho", `https://www.meesho.com/search?q=${q}`),
  ]
}

// --- 1. SerpApi Google Shopping (covers all 3) ---
async function fetchSerpApiShopping(product, maxPriceNum) {
  const key = process.env.SERPAPI_KEY
  if (!key) return []
  const params = new URLSearchParams({
    engine: "google_shopping", q: product, gl: "in", hl: "en", currency: "INR", api_key: key,
  })
  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`SerpApi error ${res.status}`)
  const data = await res.json()
  const results = data.shopping_results || []
  return results
    .slice(0, 20)
    .map((r, i) => {
      const price = r.extracted_price || parsePrice(r.price)
      const platform = detectPlatform(r.source || "")
      return {
        platform, seller: r.source || "Shopping",
        location: r.extensions?.join(" • ") || "India",
        title: r.title, price: Math.round(price) || 0,
        originalPrice: Math.round(price * 1.12) || 0,
        rating: r.rating || 4.0, reviews: r.reviews || 0,
        delivery: r.delivery || "Check on site", stock: 10, condition: "New",
        score: Math.max(70, 95 - i * 2),
        specialOffers: [r.source || "Shopping"],
        image: r.thumbnail || "/placeholder.svg?height=200&width=200",
        productUrl: r.link || r.product_link, amazonUrl: r.link || r.product_link,
        source: "serpapi",
      }
    })
    .filter((d) => d.price > 0 && d.price <= (maxPriceNum || 1000000))
}

// --- 2. Flipkart Affiliate API ---
async function fetchFlipkartAffiliate(product, maxPriceNum) {
  const id = process.env.FLIPKART_AFFILIATE_ID
  const token = process.env.FLIPKART_TOKEN
  if (!id || !token) return []
  const url = `https://affiliate-api.flipkart.net/affiliate/1.0/search.json?query=${encodeURIComponent(product)}&resultCount=10`
  const res = await fetch(url, {
    headers: { "Fk-Affiliate-Id": id, "Fk-Affiliate-Token": token },
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`Flipkart API error ${res.status}`)
  const data = await res.json()
  return (data.products || [])
    .map((p, i) => {
      const info = p.productBaseInfoV1 || {}
      const price = parsePrice((info.flipkartSpecialPrice || info.flipkartSellingPrice || {}).amount)
      return {
        platform: "flipkart", seller: "Flipkart", location: "F-Assured",
        title: info.title || product, price: Math.round(price) || 0,
        originalPrice: Math.round(parsePrice(info.mrp?.amount) || price * 1.15) || 0,
        rating: 4.3, delivery: "F-Assured delivery", stock: 10, condition: "New",
        score: Math.max(70, 93 - i * 2), specialOffers: ["F-Assured"],
        image: info.imageUrls?.["200x200"] || "/placeholder.svg?height=200&width=200",
        productUrl: info.productUrl || `https://www.flipkart.com/search?q=${encodeURIComponent(product)}`,
        amazonUrl: info.productUrl, source: "flipkart-affiliate",
      }
    })
    .filter((d) => d.price > 0 && d.price <= (maxPriceNum || 1000000))
}

// --- 3. SAME-PRODUCT demo mock: same variant, tiny price diff per platform ---
function getMockMultiPlatformDeals(product, maxPriceNum) {
  const q = encodeURIComponent(product)
  const tag = process.env.AMAZON_TAG || "dealfinder-21"
  const known = guessBasePrice(product)
  const basePrice = known?.price || 20000 + Math.floor(Math.random() * 10000)
  const mrp = known?.mrp || Math.floor(basePrice * 1.15)

  // Detect variant names like Flipkart screenshot
  const p = product.toLowerCase()
  let variants = []
  if (p.includes("iphone 17")) {
    variants = [
      { name: "Apple iPhone 17 (White, 256 GB)", price: 98900, mrp: 99900, rating: 4.6, specs: ["256 GB ROM", "16.0 cm (6.3 inch) Super Retina XDR Display", "48MP + 48MP | 18MP Front Camera", "A19 Chip, 6 Core Processor", "1 Year Limited Warranty"] },
      { name: "Apple iPhone 17 (Mist Blue, 256 GB)", price: 98900, mrp: 99900, rating: 4.6, specs: ["256 GB ROM", "16.0 cm (6.3 inch) Super Retina XDR Display", "48MP + 48MP | 18MP Front Camera", "A19 Chip, 6 Core Processor", "1 Year Limited Warranty"] },
    ]
  } else if (p.includes("iphone")) {
    variants = [{ name: `${product} (256 GB)`, price: basePrice, mrp, rating: 4.5, specs: ["256 GB ROM", "Super Retina XDR Display", "1 Year Warranty"] }]
  } else {
    variants = [{ name: product, price: basePrice, mrp, rating: 4.3, specs: [] }]
  }

  const img = "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop"
  const deals = []
  // Small realistic variance: Flipkart lowest (like screenshot), Amazon +₹500-1000, Meesho ±₹1000
  const variance = { flipkart: 0, amazon: 700, meesho: -400, croma: 1200, reliance: 900 }

  for (const v of variants) {
    if (v.price > (maxPriceNum || 1000000)) continue
    const mkDeal = (platform, seller, location, delivery, offers, url, rating) => ({
      platform, seller, location, title: v.name,
      price: v.price + (variance[platform] || 0),
      originalPrice: v.mrp, rating: rating || v.rating,
      delivery, stock: 10, condition: "New", score: 93,
      specialOffers: offers, image: img, specs: v.specs,
      productUrl: url, amazonUrl: url, source: "mock",
    })
    deals.push(
      mkDeal("flipkart", "Flipkart (RetailNet)", "F-Assured, India", "Free delivery • Bank Offer", ["F-Assured", "Bank Offer", "No-Cost EMI"], `https://www.flipkart.com/search?q=${q}`, 4.6),
      mkDeal("amazon", "Amazon.in", "Fulfilled by Amazon.in", "Prime 2-day • Free Returns", ["Prime Eligible", "Free Returns"], `https://www.amazon.in/s?k=${q}&tag=${tag}`, 4.5),
      mkDeal("meesho", "Meesho Supplier", "Meesho • Free delivery", "Free delivery • COD", ["COD Available", "Free Delivery"], `https://www.meesho.com/search?q=${q}`, 4.1),
    )
  }
  return deals.filter((d) => d.price <= (maxPriceNum || 1000000)).sort((a, b) => a.price - b.price)
}

// --- Main entry ---
export async function getMultiPlatformDeals(product, maxPriceRaw) {
  const maxPriceNum = parseInt(String(maxPriceRaw).replace(/[^0-9]/g, ""), 10) || 1000000

  const settled = await Promise.allSettled([
    fetchSerpApiShopping(product, maxPriceNum),
    fetchFlipkartAffiliate(product, maxPriceNum),
  ])
  let live = []
  for (const s of settled) {
    if (s.status === "fulfilled" && Array.isArray(s.value)) live.push(...s.value)
  }
  const seen = new Set()
  live = live.filter((d) => {
    const k = `${d.platform}-${d.title}`.toLowerCase().slice(0, 80)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  live.sort((a, b) => a.price - b.price)

  if (live.length > 0) {
    return {
      deals: live.slice(0, 18), live: true,
      comparedProducts: groupDealsIntoProducts(live),
      sources: [...new Set(live.map((d) => d.source))],
    }
  }

  const hasKeys = !!(process.env.SERPAPI_KEY || process.env.FLIPKART_AFFILIATE_ID)
  if (!hasKeys) {
    const mock = getMockMultiPlatformDeals(product, maxPriceNum)
    return { deals: mock, live: false, demo: true, comparedProducts: groupDealsIntoProducts(mock) }
  }
  const links = buildSearchLinks(product)
  return { deals: links, live: true, comparedProducts: [], sources: ["search-links"] }
}

export { PLATFORM_META, buildSearchLinks, groupDealsIntoProducts, normalizeVariantKey }
