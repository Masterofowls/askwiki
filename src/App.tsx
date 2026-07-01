import { Routes, Route, useParams } from "react-router-dom"
import { AuthView } from "@neondatabase/auth-ui"
import Layout from "./components/Layout"
import HomePage from "./pages/HomePage"
import ViewerPage from "./pages/ViewerPage"
import SearchPage from "./pages/SearchPage"

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
    <Routes>
      <Route path="/auth/:path" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/wiki/:slug" element={<ViewerPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}
