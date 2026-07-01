import { useState, useEffect, useCallback } from "react"
import { bookmarks } from "@/db/schema"
import { createDb } from "@/lib/neon"
import { useAuth } from "./AuthContext"
import { getJWTToken } from "@/lib/auth"
import { eq, and, desc } from "drizzle-orm"

export interface Bookmark {
  id: number
  slug: string
  title: string
  wikiUrl: string | null
  imageUrl: string | null
  summary: string | null
  createdAt: Date
}

export function useBookmarks() {
  const { session } = useAuth()
  const [items, setItems] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)
  const userId = session?.user?.id

  const db = useCallback(async () => {
    const token = await getJWTToken()
    if (!token) throw new Error("Not authenticated")
    return createDb(token)
  }, [getJWTToken])

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const client = await db()
      const rows = await client
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt))
      setItems(rows as Bookmark[])
    } catch (err) {
      console.error("Failed to load bookmarks:", err)
    } finally {
      setLoading(false)
    }
  }, [userId, db])

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
    }) => {
      if (!userId) throw new Error("Not authenticated")
      const client = await db()
      await client.insert(bookmarks).values({
        userId,
        slug: data.slug,
        title: data.title,
        wikiUrl: data.wikiUrl ?? null,
        imageUrl: data.imageUrl ?? null,
        summary: data.summary ?? null,
      })
      await refresh()
    },
    [userId, db, refresh],
  )

  const remove = useCallback(
    async (slug: string) => {
      if (!userId) return
      const client = await db()
      await client
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.slug, slug)))
      await refresh()
    },
    [userId, db, refresh],
  )

  const isBookmarked = useCallback(
    (slug: string) => items.some((b) => b.slug === slug),
    [items],
  )

  return { items, loading, add, remove, isBookmarked, refresh }
}
