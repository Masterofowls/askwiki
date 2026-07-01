import { useState, useEffect, useCallback } from "react"

export interface HistoryEntry {
  slug: string
  title: string
  lang: string
  wikiUrl: string
  visitedAt: string // ISO
}

const STORAGE_KEY = "askwiki:pageHistory"
const MAX_ENTRIES = 50

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function usePageHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  const refresh = useCallback(() => {
    setEntries(load())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Record a page visit. Deduplicates by slug+lang and inserts at the top. */
  const record = useCallback(
    (slug: string, title: string, lang: string, wikiUrl: string) => {
      const all = load()
      // Remove existing entry for same page
      const filtered = all.filter(
        (e) => !(e.slug === slug && e.lang === lang),
      )
      const entry: HistoryEntry = {
        slug,
        title,
        lang,
        wikiUrl,
        visitedAt: new Date().toISOString(),
      }
      const updated = [entry, ...filtered].slice(0, MAX_ENTRIES)
      save(updated)
      setEntries(updated)
    },
    [],
  )

  /** Clear all history */
  const clear = useCallback(() => {
    save([])
    setEntries([])
  }, [])

  /** Remove a single entry */
  const remove = useCallback((slug: string, lang: string) => {
    const all = load()
    const updated = all.filter((e) => !(e.slug === slug && e.lang === lang))
    save(updated)
    setEntries(updated)
  }, [])

  return { entries, record, clear, remove }
}
