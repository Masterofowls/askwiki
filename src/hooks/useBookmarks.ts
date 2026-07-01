import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./AuthContext"

export interface Bookmark {
  id: number
  slug: string
  title: string
  wikiUrl: string | null
  imageUrl: string | null
  summary: string | null
  collectionId: number | null
  createdAt: Date
  tags: string[]
}

export interface BookmarkCollection {
  id: number
  name: string
  color: string
  icon: string
  position: number
  createdAt: Date
  count: number
}

export interface BookmarkFilters {
  collectionId?: number | null
  search?: string
  tag?: string
}

// ── localStorage helper ────────────────────────────────────────────

function storageKey(userId: string, kind: "bookmarks" | "collections") {
  return `askwiki:${kind}:${userId}`
}

interface StoredBookmark {
  id: number
  slug: string
  title: string
  wikiUrl: string | null
  imageUrl: string | null
  summary: string | null
  collectionId: number | null
  createdAt: string // ISO
  tags: string[]
}

interface StoredCollection {
  id: number
  name: string
  color: string
  icon: string
  position: number
  createdAt: string // ISO
}

function loadBm(userId: string): StoredBookmark[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, "bookmarks"))
    return raw ? (JSON.parse(raw) as StoredBookmark[]) : []
  } catch {
    return []
  }
}

function saveBm(userId: string, data: StoredBookmark[]) {
  localStorage.setItem(storageKey(userId, "bookmarks"), JSON.stringify(data))
}

function loadCols(userId: string): StoredCollection[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, "collections"))
    return raw ? (JSON.parse(raw) as StoredCollection[]) : []
  } catch {
    return []
  }
}

function saveCols(userId: string, data: StoredCollection[]) {
  localStorage.setItem(storageKey(userId, "collections"), JSON.stringify(data))
}

/** Simple auto-increment within a userId namespace */
function nextId(userId: string): number {
  const key = `askwiki:nextId:${userId}`
  const cur = Number(localStorage.getItem(key) ?? "0")
  const nxt = cur + 1
  localStorage.setItem(key, String(nxt))
  return nxt
}

// ── Hook ───────────────────────────────────────────────────────────

export function useBookmarks() {
  const { session } = useAuth()
  const [items, setItems] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<BookmarkCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<BookmarkFilters>({})
  const userId = session?.user?.id as string | undefined

  // ── helpers that read/write from localStorage ──────────────────

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCollections([])
      return
    }
    setLoading(true)

    // Simulate async so the loading state is visible
    await new Promise((r) => setTimeout(r, 80))

    try {
      const storedCols = loadCols(userId)
      const storedBms = loadBm(userId)

      // Collections with counts
      const colsWithCounts: BookmarkCollection[] = storedCols
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          position: c.position,
          count: storedBms.filter((b) => b.collectionId === c.id).length,
          createdAt: new Date(c.createdAt),
        }))
        .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

      // Filter bookmarks
      let filtered = storedBms

      if (filters.collectionId !== undefined && filters.collectionId !== null) {
        filtered = filtered.filter((b) => b.collectionId === filters.collectionId)
      }
      if (filters.collectionId === null && "collectionId" in filters) {
        filtered = filtered.filter((b) => b.collectionId === null)
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        filtered = filtered.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            (b.summary ?? "").toLowerCase().includes(q),
        )
      }
      if (filters.tag) {
        filtered = filtered.filter((b) => b.tags.includes(filters.tag!))
      }

      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      setCollections(colsWithCounts)
      setItems(
        filtered.map((b) => ({
          ...b,
          createdAt: new Date(b.createdAt),
        })),
      )
    } catch {
      // localStorage may be unavailable
    } finally {
      setLoading(false)
    }
  }, [userId, filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (data: {
      slug: string
      title: string
      wikiUrl?: string
      imageUrl?: string
      summary?: string
      collectionId?: number
      tags?: string[]
    }) => {
      if (!userId) throw new Error("Not authenticated")
      const all = loadBm(userId)
      const bm: StoredBookmark = {
        id: nextId(userId),
        slug: data.slug,
        title: data.title,
        wikiUrl: data.wikiUrl ?? null,
        imageUrl: data.imageUrl ?? null,
        summary: data.summary ?? null,
        collectionId: data.collectionId ?? null,
        createdAt: new Date().toISOString(),
        tags: data.tags ?? [],
      }
      all.push(bm)
      saveBm(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const remove = useCallback(
    async (slug: string) => {
      if (!userId) return
      const all = loadBm(userId)
      saveBm(
        userId,
        all.filter((b) => b.slug !== slug),
      )
      await refresh()
    },
    [userId, refresh],
  )

  const isBookmarked = useCallback(
    (slug: string) => items.some((b) => b.slug === slug),
    [items],
  )

  // ── Collection management ─────────────────────────────────────

  const createCollection = useCallback(
    async (name: string, color?: string, icon?: string) => {
      if (!userId) throw new Error("Not authenticated")
      const all = loadCols(userId)
      all.push({
        id: nextId(userId),
        name,
        color: color ?? "#8b5cf6",
        icon: icon ?? "📁",
        position: all.length,
        createdAt: new Date().toISOString(),
      })
      saveCols(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const deleteCollection = useCallback(
    async (id: number) => {
      if (!userId) return
      saveCols(
        userId,
        loadCols(userId).filter((c) => c.id !== id),
      )
      const all = loadBm(userId)
      for (const b of all) {
        if (b.collectionId === id) b.collectionId = null
      }
      saveBm(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const renameCollection = useCallback(
    async (id: number, name: string) => {
      if (!userId) return
      const all = loadCols(userId)
      const col = all.find((c) => c.id === id)
      if (col) col.name = name
      saveCols(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const updateCollection = useCallback(
    async (id: number, data: { color?: string; icon?: string }) => {
      if (!userId) return
      const all = loadCols(userId)
      const col = all.find((c) => c.id === id)
      if (col) {
        if (data.color !== undefined) col.color = data.color
        if (data.icon !== undefined) col.icon = data.icon
      }
      saveCols(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const reorderCollection = useCallback(
    async (orderedIds: number[]) => {
      if (!userId) return
      const all = loadCols(userId)
      const map = new Map(all.map((c) => [c.id, c]))
      orderedIds.forEach((id, i) => {
        const c = map.get(id)
        if (c) c.position = i
      })
      saveCols(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const bulkAdd = useCallback(
    async (slug: string, data: { collectionId?: number }) => {
      if (!userId) return
      const all = loadBm(userId)
      const bm = all.find((b) => b.slug === slug)
      if (bm) bm.collectionId = data.collectionId ?? null
      saveBm(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const addTag = useCallback(
    async (bookmarkId: number, tag: string) => {
      if (!userId) return
      const all = loadBm(userId)
      const bm = all.find((b) => b.id === bookmarkId)
      if (bm && !bm.tags.includes(tag)) bm.tags.push(tag)
      saveBm(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  const removeTag = useCallback(
    async (bookmarkId: number, tag: string) => {
      if (!userId) return
      const all = loadBm(userId)
      const bm = all.find((b) => b.id === bookmarkId)
      if (bm) bm.tags = bm.tags.filter((t) => t !== tag)
      saveBm(userId, all)
      await refresh()
    },
    [userId, refresh],
  )

  return {
    items,
    collections,
    loading,
    filters,
    setFilters,
    add,
    remove,
    isBookmarked,
    refresh,
    createCollection,
    deleteCollection,
    renameCollection,
    updateCollection,
    reorderCollection,
    bulkAdd,
    addTag,
    removeTag,
  }
}
