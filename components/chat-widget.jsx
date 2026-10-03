"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"

export const CHAT_OPEN_EVENT = "ai-deal-finder:open-chat"

export function openChatWidget() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT))
  }
}

const STARTER_SUGGESTIONS = [
  "Best phone under ₹25,000?",
  "Compare iPhone 15 vs Galaxy S24",
  "Is 8GB RAM enough for a laptop?",
]

// All message sending lives in this ONE function: POSTs the full
// message list to /api/chat and returns the assistant reply text.
async function sendMessage(messages) {
  const payload = messages.map((m) => ({ role: m.role, content: m.text }))

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
    })

    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (data?.reply) return data.reply
    if (!res.ok) return "Sorry, I couldn't check prices right now. Please try again in a moment."
    return "Sorry, I got an empty reply. Please try asking again."
  } catch {
    return "Sorry, I couldn't reach the shopping assistant. Please check your connection and try again."
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(CHAT_OPEN_EVENT, handler)
    return () => window.removeEventListener(CHAT_OPEN_EVENT, handler)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const handleSend = async (rawText) => {
    const text = (rawText ?? input).trim()
    if (!text || loading) return

    const userMessage = { id: Date.now(), role: "user", text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    try {
      const reply = await sendMessage(nextMessages)
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: reply }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend(input)
  }

  const showSuggestions = messages.length === 0

  return (
    <>
      {/* Floating button — small (h-12 w-12) so it doesn't cover footer text or "View on" buttons */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Shopping assistant"
          className="fixed bottom-20 right-5 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b bg-muted/50 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold leading-tight">Shopping assistant</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Products, prices and buying advice</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close shopping assistant"
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
            {showSuggestions ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Hi! Ask me about products, prices, or what to buy. Try one:
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSend(s)}
                      className="rounded-full border bg-muted px-3 py-1.5 text-left text-[13px] font-medium transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-indigo-600 text-white"
                      : "mr-auto border bg-muted text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              ))
            )}

            {loading && (
              <p aria-live="polite" className="mr-auto flex items-center gap-2 rounded-2xl border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking prices...
              </p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t bg-background p-3">
            <label htmlFor="chat-widget-input" className="sr-only">
              Ask about products, prices and buying advice
            </label>
            <input
              id="chat-widget-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a product..."
              autoComplete="off"
              className="h-11 min-h-[44px] flex-1 rounded-xl border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="flex h-11 min-h-[44px] w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  )
}

export default ChatWidget
