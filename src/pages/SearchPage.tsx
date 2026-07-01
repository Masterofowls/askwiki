import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { searchWiki } from "@/services/wiki"

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const lang = searchParams.get("lang") ?? "en"

  const [results, setResults] = useState<Array<{
    title: string
    snippet: string
    url: string
    pageId: number
  }>>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) return

    let cancelled = false
    setLoading(true)
    setError(null)

    searchWiki(query, 20, lang)
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          if (data.length === 0) {
            setError(`No results found for "${query}"`)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query, lang])

  return (
    <div className="search-page">
      <div className="search-page-header">
        <h1 className="search-page-title">Search Wikipedia</h1>
      </div>

      {query && (
        <p className="search-summary">
          {loading
            ? `Searching for "${query}"...`
            : results
              ? `Found ${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`
              : `Searching for "${query}"...`}
        </p>
      )}

      {loading && (
        <div className="viewer-loading">
          <div className="loading-spinner" />
          <p className="loading-text">Searching Wikipedia...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <span className="error-icon">🔍</span>
          <h2>No Results</h2>
          <p>{error}</p>
          <Link to="/" className="action-button">
            Try a different search
          </Link>
        </div>
      )}

      {results && results.length > 0 && (
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
      )}

      {!query && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h2>Search Wikipedia</h2>
          <p>Use the search bar above to find articles on any topic.</p>
          <div style={{ marginTop: "16px" }}>
            <Link to="/" className="action-button">
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
