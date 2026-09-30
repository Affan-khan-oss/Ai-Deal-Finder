"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { SearchForm } from "@/components/search-form"
import { ProgressSection } from "@/components/progress-section"
import { ResultsSection } from "@/components/results-section"
import { Button } from "@/components/ui/button"
import { Scale, Sun, Moon, ShieldCheck } from "lucide-react"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-10 w-10 rounded-xl border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5 opacity-80" />
      )}
    </Button>
  )
}

export default function HomePage() {
  const [currentSection, setCurrentSection] = useState("search")
  const [searchData, setSearchData] = useState(null)
  const [results, setResults] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  const handleSearchStart = async (data) => {
    setSearchData(data)
    setCurrentSection("progress")

    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sessionId: newSessionId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const searchResults = await response.json()

      if (searchResults.error) {
        throw new Error(searchResults.error)
      }

      setTimeout(() => {
        setResults(searchResults)
        setCurrentSection("results")
      }, 3000)
    } catch (error) {
      console.error("Search failed:", error)
      const mockResults = {
        sessionId: newSessionId,
        deals: [],
        insights: { averagePrice: 0, maxSavings: 0, highestRating: 0, totalStock: 0 },
        searchParams: data,
        error: "Search failed, please try again",
      }

      setTimeout(() => {
        setResults(mockResults)
        setCurrentSection("results")
      }, 2000)
    }
  }

  const handleBackToSearch = () => {
    setCurrentSection("search")
    setResults(null)
    setSessionId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sticky slim header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            onClick={handleBackToSearch}
            aria-label="AI Deal Finder - back to search"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[15px] font-bold tracking-tight">AI Deal Finder</span>
              <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Amazon • Flipkart • Meesho • Croma • Reliance
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Trusted comparison
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {currentSection === "search" && <SearchForm onSearchStart={handleSearchStart} />}

          {currentSection === "progress" && <ProgressSection searchData={searchData} />}

          {currentSection === "results" && results && (
            <ResultsSection results={results} sessionId={sessionId} onBackToSearch={handleBackToSearch} />
          )}
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2024 AI Deal Finder. Compare before you buy prices update live from retailers.
          </p>
        </footer>
      </main>
    </div>
  )
}
