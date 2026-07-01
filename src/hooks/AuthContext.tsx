import { createContext, useContext, type ReactNode } from "react"
import type { BetterFetchError } from "@better-fetch/fetch"
import { auth } from "@/lib/auth"

interface AuthContextValue {
  session: {
    user: Record<string, any> | null
    session: Record<string, any> | null
  } | null
  error: BetterFetchError | null
  isPending: boolean
  isRefetching: boolean
  refetch: (queryParams?: { query?: { disableCookieCache?: boolean; disableRefresh?: boolean } }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, error, isPending, isRefetching, refetch } = auth.useSession()

  const value: AuthContextValue = {
    session: data,
    error,
    isPending,
    isRefetching,
    refetch,
    signOut: async () => { await auth.signOut() },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
