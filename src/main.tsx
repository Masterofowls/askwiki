import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { NeonAuthUIProvider } from "@neondatabase/auth-ui"
import { AuthProvider } from "./hooks/AuthContext"
import { auth } from "./lib/auth"
import App from "./App"
import "./styles/global.css"

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NeonAuthUIProvider authClient={auth}>
          <App />
        </NeonAuthUIProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
