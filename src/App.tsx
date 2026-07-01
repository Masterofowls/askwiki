import { Routes, Route, useParams } from "react-router-dom"
import { AuthView } from "@neondatabase/auth-ui"
import Layout from "./components/Layout"
import { ReadingProvider } from "./components/ReadingView"
import HomePage from "./pages/HomePage"
import ViewerPage from "./pages/ViewerPage"
import SearchPage from "./pages/SearchPage"
import BookmarksPage from "./pages/BookmarksPage"

function AuthPage() {
  const { path } = useParams()
  return (
    <div className="auth-page-container">
      <AuthView path={path ?? "sign-in"} />
    </div>
  )
}

export default function App() {
  return (
    <ReadingProvider>
      <Routes>
        <Route path="/auth/:path" element={<AuthPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/wiki/:slug" element={<ViewerPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
        </Route>
      </Routes>
    </ReadingProvider>
  )
}
