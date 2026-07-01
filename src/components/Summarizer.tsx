import { useState, useCallback } from "react"
import { summarizePage } from "@/services/aiSummarizer"

interface SummarizerProps {
  title: string
  pageContent: string
}

export default function Summarizer({ title, pageContent }: SummarizerProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSummarize = useCallback(async () => {
    if (summary) {
      // Already have a summary — just expand
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await summarizePage(title, pageContent)
      setSummary(result.summary)
    } catch (err) {
      console.error("Summarization failed:", err)
      setError(
        err instanceof Error ? err.message : "Failed to generate summary",
      )
    } finally {
      setLoading(false)
    }
  }, [title, pageContent, summary])

  const handleDismiss = useCallback(() => {
    setSummary(null)
    setError(null)
  }, [])

  return (
    <div className="summarizer">
      {!summary && !error && (
        <button
          className="toolbar-action-btn summarizer-btn"
          onClick={handleSummarize}
          disabled={loading}
          title="Generate AI summary of this page"
        >
          {loading ? (
            <>
              <span className="summarizer-spinner" />
              Summarizing...
            </>
          ) : (
            "🤖 AI Summary"
          )}
        </button>
      )}

      {loading && !summary && (
        <div className="summarizer-box summarizer-loading">
          <span className="summarizer-spinner" />
          <span>Generating summary...</span>
        </div>
      )}

      {error && (
        <div className="summarizer-box summarizer-error">
          <div className="summarizer-header">
            <span className="summarizer-label">AI Summary</span>
            <button
              className="summarizer-dismiss"
              onClick={handleDismiss}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          <p className="summarizer-error-text">{error}</p>
        </div>
      )}

      {summary && (
        <div className="summarizer-box summarizer-done">
          <div className="summarizer-header">
            <span className="summarizer-label">
              <span className="summarizer-icon">🤖</span> AI Summary
            </span>
            <button
              className="summarizer-dismiss"
              onClick={handleDismiss}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          <div className="summarizer-content">{summary}</div>
        </div>
      )}
    </div>
  )
}
