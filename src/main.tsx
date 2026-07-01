import { StrictMode, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Link as RouterLink, useNavigate } from "react-router-dom"
import { NeonAuthUIProvider } from "@neondatabase/auth-ui"
import "@neondatabase/auth-ui/css"
import { AuthProvider } from "./hooks/AuthContext"
import { auth } from "./lib/auth"
import App from "./App"
import "./styles/global.css"

// Silence the Chrome deprecation warning for the deprecated
// `beforeinstallprompt` event. Until the install prompt API
// stabilises, a no-op listener prevents the console warning.
globalThis.addEventListener?.("beforeinstallprompt", (e) => {
  e.preventDefault()
})

// AuthUIProvider expects Link with href prop; react-router-dom uses "to".
// This wrapper bridges the two APIs.
function AuthLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <RouterLink to={href} className={className}>{children}</RouterLink>
}

function AppProviders({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  return (
    <AuthProvider>
      <NeonAuthUIProvider authClient={auth} navigate={navigate} Link={AuthLink}>
        {children}
      </NeonAuthUIProvider>
    </AuthProvider>
  )
}

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
