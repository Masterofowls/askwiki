import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import SearchBar from "./SearchBar"
import { auth } from "@/lib/auth"

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const isViewer = location.pathname.startsWith("/wiki/")
  const { data: session } = auth.useSession()

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? "☰" : "☰"}
        </button>

        <Link to="/" className="app-logo">
          AskWiki
        </Link>

        <SearchBar />

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
            Paste a Wikipedia URL or search for any topic. AskWiki fetches and enhances content from Wikipedia in real-time.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`app-main ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
