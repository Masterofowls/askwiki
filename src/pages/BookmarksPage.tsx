import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/AuthContext"
import { useBookmarks, type BookmarkCollection } from "@/hooks/useBookmarks"

export default function BookmarksPage() {
  const { session } = useAuth()
  const {
    items,
    collections,
    loading,
    filters,
    setFilters,
    remove,
    createCollection,
    deleteCollection,
  } = useBookmarks()

  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newColName, setNewColName] = useState("")
  const [newColColor, setNewColColor] = useState("#8b5cf6")
  const [newColIcon, setNewColIcon] = useState("📁")

  const allTags = extractTags(items)

  function handleCreateCollection(e: FormEvent) {
    e.preventDefault()
    if (!newColName.trim()) return
    createCollection(newColName.trim(), newColColor, newColIcon)
    setNewColName("")
    setShowNewCollection(false)
  }

  if (!session?.user) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔖</div>
        <h2>Sign in to bookmark pages</h2>
        <p>Create an account to save and organize your favorite Wikipedia articles.</p>
        <Link to="/auth/sign-in" className="action-button">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-header">
        <h1 className="bookmarks-title">Bookmarks</h1>
        <div className="bookmarks-toolbar">
          <button
            className="action-button"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            onClick={() => setShowNewCollection(!showNewCollection)}
          >
            {showNewCollection ? "Cancel" : "+ Collection"}
          </button>
        </div>
      </div>

      {/* New collection form */}
      {showNewCollection && (
        <form className="create-collection-form" onSubmit={handleCreateCollection}>
          <input
            className="create-collection-input"
            placeholder="Collection name..."
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            autoFocus
          />
          <input
            type="color"
            className="create-collection-color"
            value={newColColor}
            onChange={(e) => setNewColColor(e.target.value)}
            title="Collection color"
          />
          <input
            className="create-collection-input"
            style={{ maxWidth: "80px" }}
            placeholder="📁"
            value={newColIcon}
            onChange={(e) => setNewColIcon(e.target.value)}
            title="Collection icon (emoji)"
          />
          <button
            type="submit"
            className="create-collection-submit"
            disabled={!newColName.trim()}
          >
            Create
          </button>
        </form>
      )}

      {/* Collection pills */}
      <div className="bookmarks-filters">
        <button
          className={`collection-pill-all ${!filters.collectionId && !("collectionId" in filters && filters.collectionId === null) ? "active" : ""}`}
          onClick={() => {
            const next = { ...filters }
            delete next.collectionId
            setFilters(next)
          }}
        >
          All
        </button>
        <button
          className={`collection-pill-all ${filters.collectionId === null ? "active" : ""}`}
          onClick={() => setFilters({ ...filters, collectionId: null })}
        >
          Uncategorized
        </button>
        {collections.map((col: BookmarkCollection) => (
          <div key={col.id} style={{ position: "relative", display: "inline-flex" }}>
            <button
              className={`collection-pill ${filters.collectionId === col.id ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, collectionId: col.id })}
            >
              <span
                className="collection-color-swatch"
                style={{ background: col.color }}
              />
              {col.icon} {col.name}
              <span style={{ opacity: 0.5, marginLeft: 2 }}>{col.count}</span>
            </button>
            <button
              onClick={() => deleteCollection(col.id)}
              title={`Delete "${col.name}"`}
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "var(--error)",
                color: "white",
                fontSize: "0.6rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "2px solid var(--bg-primary)",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        className="bookmarks-search-input"
        style={{ width: "100%", marginBottom: 16 }}
        placeholder="Filter bookmarks..."
        value={filters.search ?? ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="bookmarks-tag-cloud">
          <span className="tag-cloud-label">Tags</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-cloud-item ${filters.tag === tag ? "active" : ""}`}
              onClick={() => {
                if (filters.tag === tag) {
                  const next = { ...filters }
                  delete next.tag
                  setFilters(next)
                } else {
                  setFilters({ ...filters, tag })
                }
              }}
            >
              {tag}
            </button>
          ))}
          {filters.tag && (
            <button
              className="tag-cloud-item"
              onClick={() => {
                const next = { ...filters }
                delete next.tag
                setFilters(next)
              }}
              style={{ borderColor: "var(--error)", color: "var(--error)" }}
            >
              Clear tag filter
            </button>
          )}
        </div>
      )}

      {/* Bookmark list */}
      {loading ? (
        <div className="viewer-loading" style={{ padding: "40px 20px" }}>
          <div className="loading-spinner" />
          <p className="loading-text">Loading bookmarks...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: "40px 20px" }}>
          <div className="empty-icon">📑</div>
          <h2>No bookmarks yet</h2>
          <p>
            {filters.search || filters.collectionId !== undefined || filters.tag
              ? "No bookmarks match your current filters."
              : "Browse Wikipedia articles and bookmark them for later."}
          </p>
          <Link to="/" className="action-button">
            Browse Articles
          </Link>
        </div>
      ) : (
        <div>
          {items.map((bm) => (
            <div key={bm.id} className="bookmark-card">
              {bm.imageUrl && (
                <div className="bookmark-card-image">
                  <img src={bm.imageUrl} alt="" />
                </div>
              )}
              <div className="bookmark-card-body">
                <Link
                  to={`/wiki/${encodeURIComponent(bm.slug)}`}
                  className="bookmark-card-title"
                >
                  {bm.title}
                </Link>
                {bm.summary && (
                  <p className="bookmark-card-summary">{bm.summary}</p>
                )}
                <div className="bookmark-card-meta">
                  {bm.collectionId && (
                    <span className="tag" style={{ fontSize: "0.7rem" }}>
                      {
                        collections.find((c) => c.id === bm.collectionId)?.icon
                      }{" "}
                      {collections.find((c) => c.id === bm.collectionId)?.name}
                    </span>
                  )}
                  {bm.tags.length > 0 && (
                    <div className="bookmark-card-tags">
                      {bm.tags.map((t) => (
                        <span key={t} className="bookmark-card-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {new Date(bm.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="bookmark-card-actions">
                <Link
                  to={`/wiki/${encodeURIComponent(bm.slug)}`}
                  className="bookmark-icon-btn"
                  title="Open article"
                >
                  📖
                </Link>
                {bm.wikiUrl && (
                  <a
                    href={bm.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bookmark-icon-btn"
                    title="Open on Wikipedia"
                  >
                    ↗
                  </a>
                )}
                <button
                  className="bookmark-icon-btn danger"
                  onClick={() => remove(bm.slug)}
                  title="Remove bookmark"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function extractTags(items: Array<{ tags: string[] }>): string[] {
  const tagSet = new Set<string>()
  for (const item of items) {
    for (const tag of item.tags) {
      tagSet.add(tag)
    }
  }
  return [...tagSet].sort()
}
