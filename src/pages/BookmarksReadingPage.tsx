import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchWikiPage, parseWikiUrl } from "@/services/wiki"
import { formatWikiContent } from "@/services/contentFormatter"
import type { WikiPageData } from "@/services/wiki"
import { useAuth } from "@/hooks/AuthContext"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useReadingView } from "@/components/ReadingView"
import katex from "katex"
import "katex/dist/katex.min.css"

export default function BookmarksReadingPage() {
  const { slug } = useParams<{ slug: string }>()
  const lang = "en"

  const [page, setPage] = useState<WikiPageData | null>(null)
  const [formatted, setFormatted] = useState<ReturnType<typeof formatWikiContent> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const renderedRef = useRef(false)
  const { session } = useAuth()
  const { isBookmarked, add, remove } = useBookmarks()
  const bookmarked = slug ? isBookmarked(slug) : false
  const reading = useReadingView()

  // Enable reading view by default for this page
  useEffect(() => {
    if (!reading.enabled) {
      reading.toggle()
    }
  }, [])

  const fetchPage = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    setPage(null)
    setFormatted(null)

    try {
      const title = decodeURIComponent(slug).replace(/_/g, " ")
      const baseUrl = parseWikiUrl(`https://en.wikipedia.org/wiki/${slug}`).baseUrl
      const pageData = await fetchWikiPage(title, lang, baseUrl)
      setPage(pageData)
      const formattedContent = formatWikiContent(pageData.html)
      setFormatted(formattedContent)
    } catch (err) {
      console.error("Failed to fetch page:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load page.",
      )
    } finally {
      setLoading(false)
    }
  }, [slug, lang])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  useEffect(() => {
    if (!formatted || !contentRef.current || renderedRef.current) return

    const latexSpans = contentRef.current.querySelectorAll<HTMLSpanElement>(
      "span.wiki-latex[data-latex-index]",
    )
    latexSpans.forEach((span) => {
      const idx = Number.parseInt(span.dataset.latexIndex ?? "", 10)
      const expr = formatted.latexExpressions[idx]
      if (!expr) return
      try {
        katex.render(expr.raw, span, {
          displayMode: expr.display,
          throwOnError: false,
        })
      } catch {
        span.textContent = expr.raw
      }
    })

    renderedRef.current = true

    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1))
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [formatted])

  useEffect(() => {
    renderedRef.current = false
  }, [slug])

  // Reading view theme classes
  useEffect(() => {
    const body = document.body
    body.classList.add("reading-theme-light")
    return () => {
      body.classList.remove("reading-theme-light", "reading-theme-sepia")
    }
  }, [])

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Loading article...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="viewer-error">
        <div className="viewer-error-icon">📄</div>
        <h2 className="viewer-error-title">Failed to Load Article</h2>
        <p className="viewer-error-message">{error}</p>
        <Link to="/bookmarks" className="action-button">
          Back to Bookmarks
        </Link>
      </div>
    )
  }

  if (!page) return null

  return (
    <article className="bookmarks-reading-page">
      {/* Top bar */}
      <div className="bookmarks-reading-bar">
        <Link to="/bookmarks" className="bookmarks-reading-back">
          ← Back to Bookmarks
        </Link>
        <div className="bookmarks-reading-controls">
          <div className="reading-font-controls">
            <button
              className="reading-font-btn"
              onClick={reading.decreaseFont}
              title="Decrease font size"
            >
              A−
            </button>
            <span className="reading-font-size-label">
              {reading.fontSize}%
            </span>
            <button
              className="reading-font-btn"
              onClick={reading.increaseFont}
              title="Increase font size"
            >
              A+
            </button>
          </div>
          <button
            className="reading-theme-btn"
            onClick={reading.cycleTheme}
            title={`Theme: ${reading.theme}`}
          >
            {reading.theme === "dark"
              ? "🌙"
              : reading.theme === "sepia"
                ? "🟫"
                : "☀️"}
          </button>
        </div>
        {session?.user && (
          <button
            className={`bookmark-btn ${bookmarked ? "bookmarked" : ""}`}
            onClick={() => {
              if (bookmarked) {
                remove(slug!)
              } else {
                add({
                  slug: slug!,
                  title: page.displayTitle,
                  wikiUrl: page.wikiUrl,
                  ...(page.imageUrl ? { imageUrl: page.imageUrl } : {}),
                  ...(page.summary ? { summary: page.summary } : {}),
                })
              }
            }}
            title={bookmarked ? "Remove bookmark" : "Add bookmark"}
            style={{ marginLeft: "auto" }}
          >
            {bookmarked ? "★" : "☆"}
          </button>
        )}
      </div>

      {/* Page header */}
      <header className="bookmarks-reading-header">
        {page.imageUrl && (
          <img
            src={page.imageUrl}
            alt=""
            className="bookmarks-reading-hero"
          />
        )}
        <h1 className="bookmarks-reading-title">{page.displayTitle}</h1>
      </header>

      {/* Article content in reading mode */}
      <div
        ref={contentRef}
        className="bookmarks-reading-content"
        style={{ fontSize: `${reading.fontSize}%` }}
        dangerouslySetInnerHTML={{ __html: formatted?.html ?? "" }}
      />

      {/* Open on Wikipedia link */}
      <div className="bookmarks-reading-footer">
        <a
          href={page.wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button"
        >
          View on Wikipedia ↗
        </a>
      </div>
    </article>
  )
}