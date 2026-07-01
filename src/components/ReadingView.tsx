import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type ReadingTheme = "dark" | "sepia" | "light"

interface ReadingContextValue {
  enabled: boolean
  toggle: () => void
  fontSize: number
  increaseFont: () => void
  decreaseFont: () => void
  theme: ReadingTheme
  cycleTheme: () => void
}

const ReadingContext = createContext<ReadingContextValue | null>(null)

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [theme, setTheme] = useState<ReadingTheme>("dark")

  const toggle = useCallback(() => setEnabled((p) => !p), [])
  const increaseFont = useCallback(
    () => setFontSize((p) => Math.min(p + 10, 150)),
    [],
  )
  const decreaseFont = useCallback(
    () => setFontSize((p) => Math.max(p - 10, 70)),
    [],
  )
  const cycleTheme = useCallback(() => {
    setTheme((p) => {
      const themes: ReadingTheme[] = ["dark", "sepia", "light"]
      const idx = themes.indexOf(p)
      return themes[(idx + 1) % themes.length] as ReadingTheme
    })
  }, [])

  return (
    <ReadingContext.Provider
      value={{ enabled, toggle, fontSize, increaseFont, decreaseFont, theme, cycleTheme }}
    >
      {children}
    </ReadingContext.Provider>
  )
}

export function useReadingView(): ReadingContextValue {
  const ctx = useContext(ReadingContext)
  if (!ctx) throw new Error("useReadingView must be inside <ReadingProvider>")
  return ctx
}
