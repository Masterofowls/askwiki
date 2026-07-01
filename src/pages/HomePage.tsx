import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import { searchWiki, parseWikiUrl } from "@/services/wiki"
import { usePageHistory } from "@/hooks/usePageHistory"

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const { entries: historyEntries, clear: clearHistory } = usePageHistory()
  const [results, setResults] = useState<Array<{ title: string; snippet: string; url: string; pageId: number }>>()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const examples = [
    "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "https://en.wikipedia.org/wiki/Solar_System",
    "https://fr.wikipedia.org/wiki/Château_de_Versailles",
    "Quantum mechanics",
    "Python (programming language)",
  ]

  function handleUrlSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = urlInput.trim()
    if (!trimmed) return

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      /^[a-z-]+\.wikipedia\.org/i.test(trimmed)
    ) {
      const parsed = parseWikiUrl(trimmed)
      const slug = encodeURIComponent(parsed.title.replace(/ /g, "_"))
      const lang = parsed.lang !== "en" ? `?lang=${parsed.lang}` : ""
      navigate(`/wiki/${slug}${lang}`)
    } else if (/^[a-z]+(?:\.[a-z]+)?$/.test(trimmed) && !trimmed.includes(" ")) {
      navigate(`/wiki/${encodeURIComponent(trimmed.replace(/ /g, "_"))}`)
    } else {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return

    setSearching(true)
    setError(null)
    try {
      const searchResults = await searchWiki(q, 8)
      setResults(searchResults)
      if (searchResults.length === 0) {
        setError(`No results found for "${q}"`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <h1 className="home-hero-title">
          <span className="home-hero-accent">AskWiki</span>
        </h1>
        <p className="home-hero-subtitle">
          Enter a Wikipedia URL or search any topic.
          AskWiki fetches, formats, and enhances Wikipedia content
          with support for LaTeX, diagrams, images, and more.
        </p>

        {/* URL Input */}
        <form className="home-url-form" onSubmit={handleUrlSubmit}>
          <input
            type="text"
            className="home-url-input"
            placeholder="Paste Wikipedia URL or type a page title..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            aria-label="Wikipedia URL or page title"
          />
          <button type="submit" className="home-url-button">
            Go
          </button>
        </form>

        <div className="home-examples">
          {examples.map((ex) => (
            <button
              key={ex}
              className="home-example-link"
              onClick={() => {
                setUrlInput(ex)
                if (ex.startsWith("http")) {
                  const parsed = parseWikiUrl(ex)
                  const slug = encodeURIComponent(parsed.title.replace(/ /g, "_"))
                  const lang = parsed.lang !== "en" ? `?lang=${parsed.lang}` : ""
                  navigate(`/wiki/${slug}${lang}`)
                } else {
                  navigate(`/search?q=${encodeURIComponent(ex)}`)
                }
              }}
            >
              {ex.length > 40 ? `${ex.slice(0, 40)}...` : ex}
            </button>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="home-divider">
        <span>or search</span>
      </div>

      {/* Search */}
      <section>
        <form className="home-search-form" onSubmit={handleSearch}>
          <input
            type="search"
            className="home-url-input"
            placeholder="Search Wikipedia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search Wikipedia"
          />
          <button
            type="submit"
            className="home-url-button"
            disabled={searching}
          >
            {searching ? "..." : "Search"}
          </button>
        </form>
      </section>

      {error && (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "24px" }}>
          {error}
        </div>
      )}

      {/* Search Results */}
      {results && results.length > 0 && (
        <section className="home-search-results">
          <h2 className="home-section-title">Search Results</h2>
          <div className="search-results">
            {results.map((result) => (
              <Link
                key={result.pageId}
                to={`/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}`}
                className="search-result-card"
              >
                <div className="search-result-body">
                  <h2 className="search-result-title">{result.title}</h2>
                  <p className="search-result-summary">{result.snippet}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Pages */}
      {historyEntries.length > 0 && (
        <section className="home-recent">
          <div className="home-recent-header">
            <h2 className="home-section-title">Recently Viewed</h2>
            <button className="home-recent-clear" onClick={clearHistory}>
              Clear
            </button>
          </div>
          <div className="home-recent-list">
            {historyEntries.slice(0, 10).map((entry) => (
              <Link
                key={`${entry.lang}:${entry.slug}`}
                to={`/wiki/${encodeURIComponent(entry.slug)}${entry.lang !== "en" ? `?lang=${entry.lang}` : ""}`}
                className="home-recent-link"
              >
                <span className="home-recent-icon">📄</span>
                <div className="home-recent-info">
                  <span className="home-recent-title">{entry.title}</span>
                  <span className="home-recent-meta">
                    {entry.lang}.wikipedia.org · {new Date(entry.visitedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
