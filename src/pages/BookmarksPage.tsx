import { useState, type FormEvent, useRef } from "react"
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
    renameCollection,
  } = useBookmarks()

  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newColName, setNewColName] = useState("")
  const [newColColor, setNewColColor] = useState("#8b5cf6")
  const [newColIcon, setNewColIcon] = useState("📁")
  const [renamingColId, setRenamingColId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const allTags = extractTags(items)

  function handleCreateCollection(e: FormEvent) {
    e.preventDefault()
    if (!newColName.trim()) return
    createCollection(newColName.trim(), newColColor, newColIcon)
    setNewColName("")
    setShowNewCollection(false)
  }

  function startRename(col: BookmarkCollection) {
    setRenamingColId(col.id)
    setRenameValue(col.name)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  function confirmRename() {
    if (renamingColId !== null && renameValue.trim()) {
      renameCollection(renamingColId, renameValue.trim())
    }
    setRenamingColId(null)
    setRenameValue("")
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

  const activeCollection = filters.collectionId !== undefined
    ? collections.find((c) => c.id === filters.collectionId)
    : null

  return (
    <div className="bookmarks-page">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Left sidebar: collections + filters */}
      <aside className={`bookmarks-sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="bookmarks-sidebar-header">
          <h2 className="bookmarks-sidebar-title">Collections</h2>
          <button
            className="bookmarks-sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
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
            <div className="create-collection-options">
              <input
                type="color"
                className="create-collection-color"
                value={newColColor}
                onChange={(e) => setNewColColor(e.target.value)}
                title="Collection color"
              />
              <input
                className="create-collection-input"
                style={{ width: "50px", flex: "none" }}
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
            </div>
          </form>
        )}

        {/* Collection list */}
        <div className="bookmarks-sidebar-list">
          <button
            className={`bookmarks-sidebar-item ${!filters.collectionId && !("collectionId" in filters && filters.collectionId === null) ? "active" : ""}`}
            onClick={() => {
              const next = { ...filters }
              delete next.collectionId
              setMobileSidebarOpen(false)
              setFilters(next)
            }}
          >
            <span className="bookmarks-sidebar-item-icon">📚</span>
            <span className="bookmarks-sidebar-item-label">All</span>
            <span className="bookmarks-sidebar-item-count">{items.length}</span>
          </button>
          <button
            className={`bookmarks-sidebar-item ${filters.collectionId === null ? "active" : ""}`}
            onClick={() => {
              setFilters({ ...filters, collectionId: null })
              setMobileSidebarOpen(false)
            }}
          >
            <span className="bookmarks-sidebar-item-icon">📥</span>
            <span className="bookmarks-sidebar-item-label">Uncategorized</span>
            <span className="bookmarks-sidebar-item-count">
              {collections.reduce((sum, c) => sum - c.count, items.length)}
            </span>
          </button>

          {collections.map((col: BookmarkCollection) => (
            <div key={col.id} className="bookmarks-sidebar-group">
              <div
                className={`bookmarks-sidebar-item ${filters.collectionId === col.id ? "active" : ""}`}
                onClick={() => {
                  setFilters({ ...filters, collectionId: col.id })
                  setMobileSidebarOpen(false)
                }}
              >
                <span className="sidebar-color-dot" style={{ background: col.color }} />
                <span className="bookmarks-sidebar-item-icon">{col.icon}</span>
                <span className="bookmarks-sidebar-item-label">{col.name}</span>
                <span className="bookmarks-sidebar-item-count">{col.count}</span>
              </div>
              <div className="bookmarks-sidebar-item-actions">
                <button
                  className="sidebar-action-btn"
                  onClick={(e) => { e.stopPropagation(); startRename(col) }}
                  title="Rename"
                >
                  ✏
                </button>
                <button
                  className="sidebar-action-btn danger"
                  onClick={(e) => { e.stopPropagation(); deleteCollection(col.id) }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="bookmarks-sidebar-add"
          onClick={() => setShowNewCollection(!showNewCollection)}
        >
          {showNewCollection ? "Cancel" : "+ New Collection"}
        </button>
      </aside>

      {/* Main content */}
      <div className="bookmarks-main">
        {/* Top bar */}
        <div className="bookmarks-topbar">
          <button
            className="bookmarks-topbar-menu"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Show collections"
          >
            ☰
          </button>
          <h1 className="bookmarks-title">
            {activeCollection
              ? `${activeCollection.icon} ${activeCollection.name}`
              : filters.collectionId === null
                ? "📥 Uncategorized"
                : "📚 All Bookmarks"}
          </h1>
          <div className="bookmarks-topbar-spacer" />
        </div>

        {/* Search */}
        <input
          className="bookmarks-search-input"
          placeholder="Filter bookmarks..."
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        {/* Rename inline prompt */}
        {renamingColId !== null && (
          <div className="rename-overlay">
            <div className="rename-dialog">
              <h3>Rename collection</h3>
              <input
                ref={renameInputRef}
                className="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename()
                  if (e.key === "Escape") setRenamingColId(null)
                }}
              />
              <div className="rename-actions">
                <button className="action-button" onClick={confirmRename}>
                  Rename
                </button>
                <button className="action-button secondary" onClick={() => setRenamingColId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
          <div className="bookmarks-list">
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
                    <span className="bookmark-card-date">
                      {new Date(bm.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="bookmark-card-actions">
                  <Link
                    to={`/read/${encodeURIComponent(bm.slug)}`}
                    className="bookmark-icon-btn"
                    title="Reading mode"
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
