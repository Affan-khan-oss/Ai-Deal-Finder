"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Wallet, Gauge, Loader2, Sparkles } from "lucide-react"
import { openChatWidget } from "@/components/chat-widget"

const PLATFORMS = ["Amazon.in", "Flipkart", "Meesho", "Croma", "Reliance Digital"]

const QUICK_SEARCHES = [
  { label: "iPhone 15", product: "iPhone 15 128GB", maxPrice: "₹80000", location: "Pune, Maharashtra", urgency: "urgent" },
  { label: "Nike shoes", product: "Nike Air Jordan 4", maxPrice: "₹20000", location: "Bengaluru, Karnataka", urgency: "flexible" },
  { label: "Boat earbuds", product: "boAt Airdopes 141", maxPrice: "₹3000", location: "Delhi, India", urgency: "moderate" },
  { label: "Samsung TV", product: "Samsung Crystal 4K 55 inch TV", maxPrice: "₹55000", location: "Mumbai, Maharashtra", urgency: "moderate" },
]

const CATEGORIES = ["All categories", "Phones", "Laptops", "Audio", "Fashion", "TV & Appliances"]

export function SearchForm({ onSearchStart }) {
  const [formData, setFormData] = useState({
    product: "",
    maxPrice: "",
    location: "",
    urgency: "",
  })
  const [category, setCategory] = useState(CATEGORIES[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.product.trim()) return setError("Please enter a product name to compare.")
    if (!formData.maxPrice.trim()) return setError("Please enter your maximum budget.")
    if (!formData.location.trim()) return setError("Please enter your location.")
    if (!formData.urgency) return setError("Please choose how urgently you need it.")

    const priceNum = Number.parseInt(formData.maxPrice.replace(/[^0-9]/g, ""), 10)
    if (isNaN(priceNum) || priceNum <= 0) {
      return setError("Please enter a valid budget, e.g. ₹15000.")
    }

    setError("")
    setIsLoading(true)
    try {
      await onSearchStart(formData)
    } catch (err) {
      console.error("Search start failed:", err)
      setError("Failed to start search. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fillPreset = (preset) => {
    setFormData({
      product: preset.product,
      maxPrice: preset.maxPrice,
      location: preset.location,
      urgency: preset.urgency,
    })
    setError("")
  }

  const inputCls =
    "min-h-[44px] rounded-xl border-slate-200 bg-white text-[15px] focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"

  return (
    <div className="px-5 py-10 sm:px-8 md:px-12 md:py-14">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[13px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          All Search In Place
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
          Find the lowest price, instantly.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 md:text-base dark:text-slate-400">
          Type a product once. We check live prices delivery and offers side-by-side.
        </p>
      </div>

      {/* Large search bar */}
      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-3xl" aria-label="Compare prices">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/60">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="product"
              aria-label="Product name"
              placeholder="Search iPhone 15, Nike shoes, boAt earbuds…"
              value={formData.product}
              onChange={(e) => handleInputChange("product", e.target.value)}
              className={`${inputCls} h-12 border-0 bg-transparent pl-11 shadow-none focus-visible:ring-2`}
            />
          </div>
          <div className="sm:w-48">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                aria-label="Category"
                className="h-12 rounded-xl border-0 bg-transparent text-[15px] focus:ring-indigo-500"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 min-h-[44px] rounded-xl bg-indigo-600 px-7 text-[15px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:ring-indigo-500"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Searching…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="h-5 w-5" aria-hidden="true" />
                Compare Prices
              </span>
            )}
          </Button>
        </div>

        {/* Platforms */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-[13px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Compares prices from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Supported platforms">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Quick searches */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_SEARCHES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => fillPreset(q)}
              className="min-h-[36px] rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
            >
              {q.label}
            </button>
          ))}
          <button
            type="button"
            onClick={openChatWidget}
            aria-label="Open AI shopping assistant"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Confused? Ask AI
          </button>
        </div>

        {error && (
          <p role="alert" className="mx-auto mt-4 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Refine row */}
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-1.5">
            <Label htmlFor="maxPrice" className="flex items-center gap-1.5 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Max budget
            </Label>
            <Input
              id="maxPrice"
              placeholder="₹80000"
              value={formData.maxPrice}
              onChange={(e) => handleInputChange("maxPrice", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="Pune, Maharashtra"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="urgency" className="flex items-center gap-1.5 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Urgency
            </Label>
            <Select value={formData.urgency} onValueChange={(v) => handleInputChange("urgency", v)}>
              <SelectTrigger id="urgency" className={`${inputCls} h-11`}>
                <SelectValue placeholder="How soon?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASAP">ASAP need it now</SelectItem>
                <SelectItem value="urgent">Urgent 1–2 days</SelectItem>
                <SelectItem value="moderate">Moderate within a week</SelectItem>
                <SelectItem value="flexible">Flexible best deal wins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </div>
  )
}
