import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { fetchWikiPage, parseWikiUrl } from "@/services/wiki"
import { formatWikiContent } from "@/services/contentFormatter"
import { htmlToMarkdown, downloadMarkdown, copyToClipboard, htmlToPlainText } from "@/services/markdownExport"
import type { WikiPageData } from "@/services/wiki"
import { useAuth } from "@/hooks/AuthContext"
import { useBookmarks } from "@/hooks/useBookmarks"
import { usePageHistory } from "@/hooks/usePageHistory"
import { useReadingView } from "@/components/ReadingView"
import { useUrlPreview, UrlPreviewCard } from "@/components/UrlPreview"
import Summarizer from "@/components/Summarizer"
import katex from "katex"
import "katex/dist/katex.min.css"

export default function ViewerPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const lang = searchParams.get("lang") ?? "en"

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
  const urlPreview = useUrlPreview()
  const { record: recordHistory } = usePageHistory()
  const [tooltip, setTooltip] = useState<string | null>(null)

  const showTooltip = useCallback((msg: string) => {
    setTooltip(msg)
    setTimeout(() => setTooltip(null), 2000)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!contentRef.current) return
    const text = htmlToPlainText(contentRef.current.innerHTML)
    const ok = await copyToClipboard(text)
    showTooltip(ok ? "Copied to clipboard!" : "Copy failed")
  }, [showTooltip])

  const handleExportMarkdown = useCallback(() => {
    if (!contentRef.current || !page) return
    const md = htmlToMarkdown(contentRef.current.innerHTML)
    const filename = `${page.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`
    downloadMarkdown(md, filename)
    showTooltip("Markdown downloaded!")
  }, [page, showTooltip])

  const fetchPage = useCallback(async () => {
    if (!slug) return

    setLoading(true)
    setError(null)
    setPage(null)
    setFormatted(null)

    try {
      const title = decodeURIComponent(slug).replace(/_/g, " ")
      const baseUrl = parseWikiUrl(
        `https://${lang}.wikipedia.org/wiki/${slug}`,
      ).baseUrl

      const pageData = await fetchWikiPage(title, lang, baseUrl)
      setPage(pageData)
      recordHistory(slug!, pageData.title, lang, pageData.wikiUrl)

      const formattedContent = formatWikiContent(pageData.html)
      setFormatted(formattedContent)
    } catch (err) {
      console.error("Failed to fetch page:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load page. Please check the URL and try again.",
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

    // Attach URL preview listeners to wiki links
    const links = contentRef.current.querySelectorAll("a[href]")
    links.forEach((link) => {
      const href = link.getAttribute("href") ?? ""
      if (!href.startsWith("https://") && !href.startsWith("http://")) return

      link.addEventListener("mouseenter", (e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        urlPreview.show(href, rect.left, rect.bottom)
      })
      link.addEventListener("mouseleave", () => {
        urlPreview.hide()
      })
    })

    renderedRef.current = true

    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1))
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }

    // Cleanup listeners on re-render
    return () => {
      links.forEach((link) => {
        link.removeEventListener("mouseenter", () => {})
        link.removeEventListener("mouseleave", () => {})
      })
    }
  }, [formatted, urlPreview])

  useEffect(() => {
    renderedRef.current = false
  }, [slug])

  // Reading view class on body for theme
  useEffect(() => {
    const body = document.body
    if (reading.enabled && reading.theme === "sepia") {
      body.classList.add("reading-theme-sepia")
    } else {
      body.classList.remove("reading-theme-sepia")
    }
    if (reading.enabled && reading.theme === "light") {
      body.classList.add("reading-theme-light")
    } else {
      body.classList.remove("reading-theme-light")
    }
    return () => {
      body.classList.remove("reading-theme-sepia", "reading-theme-light")
    }
  }, [reading.enabled, reading.theme])

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Fetching page from Wikipedia...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="viewer-error">
        <div className="viewer-error-icon">📄</div>
        <h2 className="viewer-error-title">Failed to Load Page</h2>
        <p className="viewer-error-message">{error}</p>
        <Link to="/" className="action-button">
          Back to Home
        </Link>
      </div>
    )
  }

  if (!page) return null

  return (
    <article className="viewer-page">
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <button
          className={`reading-view-toggle ${reading.enabled ? "active" : ""}`}
          onClick={reading.toggle}
        >
          {reading.enabled ? "📖 Reading View" : "📄 Reading View"}
        </button>

        {reading.enabled && (
          <>
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
          </>
        )}

        <span className="toolbar-separator" />

        {/* Copy page to clipboard */}
        <button
          className="toolbar-action-btn"
          onClick={handleCopy}
          title="Copy full page text to clipboard"
        >
          📋 Copy
        </button>

        {/* Export as Markdown */}
        <button
          className="toolbar-action-btn"
          onClick={handleExportMarkdown}
          title="Download as Markdown file"
        >
          ⬇️ .md
        </button>

        <span className="toolbar-separator" />

        {/* AI Summary */}
        <Summarizer
          title={page.displayTitle}
          pageContent={contentRef.current ? htmlToPlainText(contentRef.current.innerHTML) : ""}
        />

        {/* Toast / tooltip */}
        {tooltip && <span className="toolbar-toast">{tooltip}</span>}
      </div>

      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{page.displayTitle}</span>
      </nav>

      {/* Page Header */}
      <header className="viewer-header">
        <h1 className="viewer-title">{page.displayTitle}</h1>
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
          >
            {bookmarked ? "★" : "☆"}
          </button>
        )}
        <div className="viewer-meta">
          {page.categories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {page.categories.slice(0, 8).map((cat) => (
                <span key={cat} className="tag">
                  {cat}
                </span>
              ))}
            </div>
          )}
          <a
            href={page.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="viewer-wiki-link"
          >
            View on Wikipedia ↗
          </a>
        </div>
      </header>

      {/* Summary */}
      {page.summary && (
        <div className="viewer-summary">{page.summary}</div>
      )}

      {/* Hero Image */}
      {page.imageUrl && (
        <figure className="wiki-thumb" style={{ marginBottom: "24px" }}>
          <div className="wiki-thumb-inner" style={{ display: "block" }}>
            <img
              src={page.imageUrl}
              alt={page.displayTitle}
              style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
            />
          </div>
        </figure>
      )}

      {/* Formatted Wikipedia Content */}
      <div
        ref={contentRef}
        className="wiki-content"
        style={
          reading.enabled
            ? { fontSize: `${reading.fontSize}%` }
            : undefined
        }
        dangerouslySetInnerHTML={{ __html: formatted?.html ?? "" }}
      />

      {/* Placeholder for LaTeX rendering - will use KaTeX */}
      {formatted && formatted.latexExpressions.length > 0 && (
        <div className="latex-placeholder" style={{ display: "none" }}>
          {formatted.latexExpressions.map((expr, i) => (
            <span key={i} data-latex={expr.raw} data-display={expr.display} />
          ))}
        </div>
      )}

      {/* URL Preview card */}
      <UrlPreviewCard
        preview={urlPreview.preview}
        position={urlPreview.position}
        visible={urlPreview.visible}
      />
    </article>
  )
}
