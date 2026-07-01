import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import SearchBar from "./SearchBar"
import { auth } from "@/lib/auth"
import { useReadingView } from "./ReadingView"

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isViewer = location.pathname.startsWith("/wiki/")
  const { data: session } = auth.useSession()
  const { enabled: readingEnabled } = useReadingView()

  const mainClass = [
    "app-main",
    sidebarOpen ? "" : "sidebar-collapsed",
    readingEnabled ? "reading-active" : "",
  ]
    .filter(Boolean)
    .join(" ")

  function NavLink({ to, icon, label }: { to: string; icon: string; label: string }) {
    const isActive = location.pathname === to
    return (
      <Link
        to={to}
        className={`bottom-nav-link ${isActive ? "active" : ""}`}
        onClick={() => {
          setSidebarOpen(false)
          setMobileSearchOpen(false)
        }}
      >
        <span className="bottom-nav-icon">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <div className={`app-layout ${readingEnabled ? "reading-view" : ""}`}>
      {/* Header */}
      <header className="app-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          ☰
        </button>

        <Link to="/" className="app-logo">
          AskWiki
        </Link>

        <SearchBar />

        <button
          className="mobile-search-btn"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
        >
          🔍
        </button>

        <div className="header-right">
          {session?.user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {session.user.email ?? session.user.name ?? "User"}
              </span>
              <button className="auth-btn" onClick={() => auth.signOut()}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => navigate("/auth/sign-in")}>
              Sign In
            </button>
          )}
          <a
            href="https://en.wikipedia.org"
            target="_blank"
            rel="noopener noreferrer"
            className="tag"
            style={{ fontSize: "0.75rem" }}
          >
            Wikipedia
          </a>
        </div>
      </header>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Navigate</div>
          <Link
            to="/"
            className={`sidebar-link ${location.pathname === "/" ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-link-icon">🏠</span>
            Home
          </Link>
          <Link
            to="/search"
            className={`sidebar-link ${location.pathname === "/search" ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-link-icon">🔍</span>
            Search
          </Link>
          {session?.user && (
            <Link
              to="/bookmarks"
              className={`sidebar-link ${location.pathname === "/bookmarks" ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">🔖</span>
              Bookmarks
            </Link>
          )}
        </div>

        {isViewer && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Article</div>
            <button
              className="sidebar-link"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" })
                setSidebarOpen(false)
              }}
            >
              <span className="sidebar-link-icon">⬆</span>
              Back to Top
            </button>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Tips</div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "0 8px", lineHeight: 1.5 }}>
            Paste a Wikipedia URL or search for any topic. AskWiki fetches and enhances Wikipedia content in real-time.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className={mainClass}>
        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="mobile-search-overlay">
          <div className="mobile-search-header">
            <input
              className="mobile-search-input"
              placeholder="Search Wikipedia..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value.trim()) {
                  navigate(`/search?q=${encodeURIComponent((e.currentTarget as HTMLInputElement).value.trim())}`)
                  setMobileSearchOpen(false)
                }
              }}
            />
            <button
              className="mobile-search-close"
              onClick={() => setMobileSearchOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation (mobile) */}
      <nav className="bottom-nav">
        <NavLink to="/" icon="🏠" label="Home" />
        <NavLink to="/search" icon="🔍" label="Search" />
        {session?.user ? (
          <NavLink to="/bookmarks" icon="🔖" label="Bookmarks" />
        ) : (
          <NavLink to="/auth/sign-in" icon="🔐" label="Sign In" />
        )}
        <button
          className="bottom-nav-link"
          onClick={() => {
            window.open("https://en.wikipedia.org", "_blank")
          }}
          style={{ fontFamily: "inherit", cursor: "pointer" }}
        >
          <span className="bottom-nav-icon">🌐</span>
          Wikipedia
        </button>
      </nav>
    </div>
  )
}
