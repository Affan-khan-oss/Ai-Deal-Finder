"use client"

import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"

const STEPS = [
  "Searching Amazon.in",
  "Checking Flipkart",
  "Scanning Meesho",
  "Comparing Croma & Reliance",
  "Ranking the best deals",
]

export function ProgressSection({ searchData }) {
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime((p) => p + 1), 1000)
    const bar = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 11 + 4, 96))
    }, 700)
    return () => {
      clearInterval(timer)
      clearInterval(bar)
    }
  }, [])

  const activeStep = Math.min(Math.floor((progress / 100) * STEPS.length), STEPS.length - 1)
  const pct = Math.round(progress)

  return (
    <div className="px-5 py-10 sm:px-8 md:px-12" aria-live="polite">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          Comparing live prices
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Hunting deals for “{searchData?.product || "your product"}”
        </h2>
        <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-400">
          Checking 5 stores • {elapsedTime}s elapsed • usually takes under 30 seconds
        </p>
      </div>

      {/* Progress bar */}
      <div className="mx-auto mt-8 max-w-2xl">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Search progress"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          {pct}% complete
        </p>
      </div>

      {/* Step indicator */}
      <ol className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-2 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const done = i < activeStep
          const active = i === activeStep
          return (
            <li
              key={step}
              className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : active
                    ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              {done ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : active ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                  {i + 1}
                </span>
              )}
              {step}
            </li>
          )
        })}
      </ol>

      {/* Skeleton cards */}
      <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
