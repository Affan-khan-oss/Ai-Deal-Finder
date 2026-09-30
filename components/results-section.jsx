"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Star, Truck, Mail, ArrowLeft, TrendingDown, IndianRupee,
  CheckCircle2, SearchX, TriangleAlert, X, ExternalLink, Store, BadgeCheck, PiggyBank,
} from "lucide-react"

const PLATFORM_META = {
  amazon: { label: "Amazon.in", initial: "a", badge: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300" },
  flipkart: { label: "Flipkart", initial: "F", badge: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300" },
  meesho: { label: "Meesho", initial: "M", badge: "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-300" },
  croma: { label: "Croma", initial: "C", badge: "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300" },
  reliance: { label: "Reliance", initial: "R", badge: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" },
  google: { label: "Shopping", initial: "G", badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" },
}

function inr(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—"
  return "₹" + Number(n).toLocaleString("en-IN")
}

function ProductImage({ src, alt }) {
  const [err, setErr] = useState(false)
  const finalSrc = !src || err ? "/placeholder.svg" : src
  return (
    <div className="h-52 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-56 md:w-56 dark:border-slate-700 dark:bg-slate-950">
      <img
        src={finalSrc}
        alt={alt || "Product image"}
        loading="lazy"
        onError={() => setErr(true)}
        className="h-full w-full object-contain p-4"
      />
    </div>
  )
}

export function ResultsSection({ results, sessionId, onBackToSearch }) {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [showDemo, setShowDemo] = useState(true)
  const { toast, toasts, dismiss } = useToast()

  const groups = useMemo(() => {
    if (results.comparedProducts?.length) {
      return [...results.comparedProducts].map((g) => ({
        ...g,
        platforms: [...(g.platforms || [])].sort((a, b) => (a.price || 0) - (b.price || 0)),
      }))
    }
    const deals = results.deals || []
    if (!deals.length) return []
    const priced = deals.filter((d) => d.price > 0).sort((a, b) => a.price - b.price)
    if (!priced.length) return []
    const first = priced[0]
    return [{
      id: "g1", name: first.title, image: first.image, specs: first.specs || [],
      mrp: Math.max(...priced.map((d) => d.originalPrice || d.price)),
      rating: results.insights?.highestRating || 0,
      platforms: priced.map((d) => ({
        platform: d.platform || "google", seller: d.seller, price: d.price,
        originalPrice: d.originalPrice, rating: d.rating, delivery: d.delivery,
        url: d.productUrl || d.amazonUrl, specialOffers: d.specialOffers || [],
      })),
      bestPrice: priced[0].price, bestPlatform: priced[0].platform,
      savings: Math.max(...priced.map((d) => (d.originalPrice || d.price) - d.price)),
      priceDiff: priced[priced.length - 1].price - priced[0].price,
      count: priced.length,
    }]
  }, [results])

  const handleSendEmail = async () => {
    const clean = email.trim()
    if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
      toast({ title: "Enter a valid email", description: "We need a valid address to send your comparison report." })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, sessionId, results }),
      })
      if (!res.ok) throw new Error("send failed")
      toast({ title: "Report sent", description: `Comparison report sent to ${clean}.` })
      setEmail("")
    } catch (e) {
      console.error(e)
      toast({ title: "Could not send report", description: "Please try again in a moment." })
    } finally {
      setSending(false)
    }
  }

  const stats = [
    { icon: IndianRupee, label: "Lowest price", value: inr(results.insights?.bestPrice || results.insights?.averagePrice) },
    { icon: PiggyBank, label: "Max savings vs MRP", value: inr(results.insights?.maxSavings) },
    { icon: Star, label: "Top rating", value: `${results.insights?.highestRating || 0}/5` },
    { icon: Store, label: "Platforms", value: String((results.insights?.platformsCompared || []).length || groups[0]?.platforms?.length || 0) },
  ]

  return (
    <div className="px-5 py-8 sm:px-8 md:px-10">
      {/* Dismissible demo / live banner */}
      {results.demo && showDemo && (
        <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Demo prices shown.</strong> Add <code>SERPAPI_KEY</code> to <code>.env</code> for live Amazon / Flipkart / Meesho prices.</span>
          </p>
          <button onClick={() => setShowDemo(false)} aria-label="Dismiss demo notice" className="rounded-lg p-1 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-amber-900/40">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {results.error && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{results.error} — showing whatever we could find. Try widening your budget.</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <BadgeCheck className="h-7 w-7 text-indigo-600" aria-hidden="true" />
            Price comparison
          </h2>
          <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">
            {groups.length} product{groups.length !== 1 ? "s" : ""} found • sorted cheapest first
            {results.searchParams?.product ? ` • “${results.searchParams.product}”` : ""}
          </p>
        </div>
        <Button onClick={onBackToSearch} variant="outline" className="min-h-[44px] rounded-xl">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> New search
        </Button>
      </div>

      {/* Stats */}
      {groups.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="rounded-2xl border-slate-200 shadow-sm dark:border-slate-800">
              <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xl font-extrabold tracking-tight sm:text-2xl">{s.value}</span>
                  <span className="block text-[13px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="mb-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-800">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-bold">No deals found in budget</h3>
          <p className="mt-1 max-w-sm text-[15px] text-slate-600 dark:text-slate-400">
            Try a broader product name or increase your maximum budget, then compare again.
          </p>
          <Button onClick={onBackToSearch} className="mt-5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to search
          </Button>
        </div>
      )}

      {/* Product groups */}
      <div className="mb-10 space-y-6">
        {groups.map((g, gi) => {
          const maxPrice = Math.max(...g.platforms.map((p) => p.price || 0))
          const offPct = g.mrp && g.bestPrice ? Math.round(((g.mrp - g.bestPrice) / g.mrp) * 100) : 0
          return (
            <Card key={g.id || gi} className="overflow-hidden rounded-2xl border-slate-200 shadow-sm transition hover:shadow-md dark:border-slate-800">
              <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:p-6 md:flex-row dark:border-slate-800">
                <ProductImage src={g.image} alt={g.name} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold leading-snug sm:text-xl">{g.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[13px] font-bold text-white">
                      {g.rating || 4.3} <Star className="h-3 w-3 fill-white" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Verified seller ratings</span>
                  </div>
                  {g.specs?.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {g.specs.slice(0, 5).map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(g.platforms || []).slice(0, 5).map((p) => (
                      <Badge key={p.platform} variant="outline" className="text-xs font-medium">{PLATFORM_META[p.platform]?.label || p.platform}</Badge>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 md:w-56 md:text-right">
                  <p className="text-[13px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Best price</p>
                  <p className="text-3xl font-extrabold tracking-tight">{inr(g.bestPrice)}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="line-through">{inr(g.mrp)}</span>
                    {offPct > 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{offPct}% off</span>}
                  </p>
                  <Badge className="mt-2 bg-indigo-600 hover:bg-indigo-600">Lowest on {PLATFORM_META[g.bestPlatform]?.label || g.bestPlatform}</Badge>
                  {g.priceDiff > 0 && (
                    <p className="mt-2 flex items-center gap-1 text-[13px] font-medium text-emerald-700 md:justify-end dark:text-emerald-400">
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      You save {inr(g.priceDiff)} vs highest ({inr(maxPrice)})
                    </p>
                  )}
                  {/* price range bar */}
                  <div className="mt-3" aria-hidden="true">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500" style={{ width: maxPrice > g.bestPrice ? `${Math.max(18, 100 - ((maxPrice - g.bestPrice) / maxPrice) * 100)}%` : "100%" }} />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{inr(g.bestPrice)}</span><span>{inr(maxPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="space-y-2.5 bg-slate-50/60 p-4 sm:p-5 dark:bg-slate-950/40">
                {g.platforms.map((p) => {
                  const meta = PLATFORM_META[p.platform] || PLATFORM_META.google
                  const isBest = p.platform === g.bestPlatform && p.price === g.bestPrice
                  const diff = (p.price || 0) - (g.bestPrice || 0)
                  return (
                    <div
                      key={p.platform}
                      className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 transition hover:shadow-sm sm:grid sm:grid-cols-[170px_1fr_auto] sm:items-center dark:bg-slate-900 ${isBest ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-slate-200 dark:border-slate-800"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-extrabold ${meta.badge}`} aria-hidden="true">
                          {meta.initial}
                        </span>
                        <div>
                          <p className="text-sm font-bold leading-none">{meta.label}</p>
                          <p className="mt-1 max-w-[150px] truncate text-xs text-slate-500 dark:text-slate-400">{p.seller || "Verified seller"}</p>
                        </div>
                        {isBest && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Best
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`text-xl font-extrabold ${isBest ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{inr(p.price)}</span>
                          {p.originalPrice > p.price && <span className="text-sm text-slate-400 line-through">{inr(p.originalPrice)}</span>}
                          {diff > 0 ? (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">+{inr(diff)} vs best</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Lowest price</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> {p.rating || "—"}/5</span>
                          <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" /> {p.delivery || "Check on site"}</span>
                        </div>
                        {p.specialOffers?.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.specialOffers.slice(0, 3).map((o, i) => (
                              <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{o}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => p.url && window.open(p.url, "_blank", "noopener,noreferrer")}
                        aria-label={`View listing on ${meta.label}`}
                        variant={isBest ? "default" : "outline"}
                        className={`min-h-[44px] w-full rounded-xl font-semibold sm:w-40 ${isBest ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" /> View on {meta.label.split(" ")[0]}
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Email report */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-xl font-bold">Get this comparison by email</h3>
          <p className="mx-auto mt-1 max-w-md text-[15px] text-slate-600 dark:text-slate-400">Same product, every platform price and the best-pick in your inbox.</p>
          <div className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              aria-label="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendEmail() }}
              className="h-11 min-h-[44px] flex-1 rounded-xl"
            />
            <Button onClick={handleSendEmail} disabled={sending} className="min-h-[44px] rounded-xl bg-indigo-600 px-6 font-semibold hover:bg-indigo-700">
              {sending ? "Sending…" : "Send Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toast viewport (use-toast) */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {(toasts || []).map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
