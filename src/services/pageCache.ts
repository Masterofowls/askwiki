// Page cache service - stores fetched wiki pages in localStorage
// Falls back gracefully if localStorage is unavailable or full.

import type { WikiPageData } from "./wiki"

interface CacheEntry {
  data: WikiPageData
  timestamp: number
  /** TTL in milliseconds */
  ttl: number
}

const CACHE_PREFIX = "askwiki:pagecache:"
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_ENTRIES = 100

function cacheKey(lang: string, title: string): string {
  return `${CACHE_PREFIX}${lang}:${title.toLowerCase().replace(/\s+/g, "_")}`
}

function isAvailable(): boolean {
  try {
    localStorage.setItem("__askwiki_cache_test__", "1")
    localStorage.removeItem("__askwiki_cache_test__")
    return true
  } catch {
    return false
  }
}

/** Store a page in cache. Evicts oldest entries if storage is full or over limit. */
export function cachePage(lang: string, title: string, data: WikiPageData, ttl = DEFAULT_TTL): void {
  if (!isAvailable()) return

  const key = cacheKey(lang, title)
  const entry: CacheEntry = { data, timestamp: Date.now(), ttl }

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Storage full – evict oldest entries until it fits
    evictOldest()
    try {
      localStorage.setItem(key, JSON.stringify(entry))
    } catch {
      // Give up
    }
  }

  // Also enforce max count by evicting oldest over the limit
  pruneEntries()
}

/** Retrieve a cached page if it's still fresh. Returns null if missing/expired. */
export function getCachedPage(lang: string, title: string): WikiPageData | null {
  if (!isAvailable()) return null

  const key = cacheKey(lang, title)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry
    const age = Date.now() - entry.timestamp

    if (age > entry.ttl) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/** Remove a specific cached page */
export function invalidatePage(lang: string, title: string): void {
  if (!isAvailable()) return
  localStorage.removeItem(cacheKey(lang, title))
}

/** Clear all cached pages */
export function clearCache(): void {
  if (!isAvailable()) return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}

/** Get cache stats */
export function cacheStats(): { entries: number; sizeBytes: number } {
  if (!isAvailable()) return { entries: 0, sizeBytes: 0 }
  let entries = 0
  let sizeBytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) {
      entries++
      const val = localStorage.getItem(k)
      if (val) sizeBytes += val.length * 2 // UTF-16
    }
  }
  return { entries, sizeBytes }
}

// ── Helpers ─────────────────────────────────────────────────────

function evictOldest(): void {
  const entries: Array<{ key: string; timestamp: number }> = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(CACHE_PREFIX)) continue
    try {
      const entry = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry
      entries.push({ key: k, timestamp: entry.timestamp ?? 0 })
    } catch {
      entries.push({ key: k, timestamp: 0 })
    }
  }
  entries.sort((a, b) => a.timestamp - b.timestamp)

  // Remove oldest 20% or at least 1
  const removeCount = Math.max(1, Math.floor(entries.length * 0.2))
  entries.slice(0, removeCount).forEach((e) => localStorage.removeItem(e.key))
}

function pruneEntries(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k)
  }
  if (keys.length <= MAX_ENTRIES) return

  const withTime = keys
    .map((k) => {
      try {
        const entry = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry
        return { key: k, timestamp: entry.timestamp ?? 0 }
      } catch {
        return { key: k, timestamp: 0 }
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp) // newest first

  // Remove everything past MAX_ENTRIES
  withTime.slice(MAX_ENTRIES).forEach((e) => localStorage.removeItem(e.key))
}
