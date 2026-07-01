import { useState, useEffect, useCallback } from "react"
import { bookmarks, bookmarkCollections, bookmarkTags } from "@/db/schema"
import { createDb } from "@/lib/neon"
import { useAuth } from "./AuthContext"
import { getJWTToken } from "@/lib/auth"
import { eq, and, desc, like, or, sql, isNull } from "drizzle-orm"

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

export function useBookmarks() {
  const { session } = useAuth()
  const [items, setItems] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<BookmarkCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<BookmarkFilters>({})
  const userId = session?.user?.id

  const db = useCallback(async () => {
    const token = await getJWTToken()
    if (!token) throw new Error("Not authenticated")
    return createDb(token)
  }, [getJWTToken])

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCollections([])
      return
    }
    setLoading(true)
    try {
      const client = await db()

      // Load collections with counts
      const allCollections = await client
        .select()
        .from(bookmarkCollections)
        .where(eq(bookmarkCollections.userId, userId))
        .orderBy(
          bookmarkCollections.position,
          bookmarkCollections.name,
        )

      const colsWithCounts: BookmarkCollection[] = []
      for (const col of allCollections) {
        const countResult = await client
          .select({ count: sql<number>`count(*)` })
          .from(bookmarks)
          .where(
            and(eq(bookmarks.userId, userId), eq(bookmarks.collectionId, col.id)),
          )
        colsWithCounts.push({
          id: col.id,
          name: col.name,
          color: col.color ?? "#8b5cf6",
          icon: col.icon ?? "📁",
          position: col.position ?? 0,
          createdAt: col.createdAt,
          count: Number((countResult[0] as { count: number })?.count ?? 0),
        })
      }
      setCollections(colsWithCounts)

      // Load bookmarks with tag filtering
      let conditions = [eq(bookmarks.userId, userId)]
      if (filters.collectionId !== undefined && filters.collectionId !== null) {
        conditions.push(eq(bookmarks.collectionId, filters.collectionId))
      }
      if (filters.collectionId === null && "collectionId" in filters) {
        conditions.push(isNull(bookmarks.collectionId))
      }
      if (filters.search) {
        const searchCondition = or(
          like(bookmarks.title, `%${filters.search}%`),
          like(bookmarks.summary, `%${filters.search}%`),
        )
        if (searchCondition) {
          conditions.push(searchCondition)
        }
      }

      const rows = await client
        .select()
        .from(bookmarks)
        .where(and(...conditions))
        .orderBy(desc(bookmarks.createdAt))

      // Fetch tags for each bookmark
      const itemsWithTags: Bookmark[] = await Promise.all(
        rows.map(async (b) => {
          const tagRows = await client
            .select()
            .from(bookmarkTags)
            .where(eq(bookmarkTags.bookmarkId, b.id))
          return {
            id: b.id,
            slug: b.slug,
            title: b.title,
            wikiUrl: b.wikiUrl,
            imageUrl: b.imageUrl,
            summary: b.summary,
            collectionId: b.collectionId,
            createdAt: b.createdAt,
            tags: tagRows.map((t: { tag: string }) => t.tag),
          }
        }),
      )

      // Filter by tag if specified
      const filtered = filters.tag
        ? itemsWithTags.filter((b) => b.tags.includes(filters.tag!))
        : itemsWithTags

      setItems(filtered)
    } catch (err) {
      console.error("Failed to load bookmarks:", err)
    } finally {
      setLoading(false)
    }
  }, [userId, db, filters])

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
      const client = await db()
      const [inserted] = await client
        .insert(bookmarks)
        .values({
          userId,
          slug: data.slug,
          title: data.title,
          wikiUrl: data.wikiUrl ?? null,
          imageUrl: data.imageUrl ?? null,
          summary: data.summary ?? null,
          collectionId: data.collectionId ?? null,
        })
        .returning()

      if (data.tags && data.tags.length > 0 && inserted) {
        await client.insert(bookmarkTags).values(
          data.tags.map((tag) => ({
            bookmarkId: (inserted as { id: number }).id,
            tag,
          })),
        )
      }

      await refresh()
    },
    [userId, db, refresh],
  )

  const remove = useCallback(
    async (slug: string) => {
      if (!userId) return
      const client = await db()
      const toRemove = await client
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.slug, slug)))
        .limit(1)
      if (toRemove.length > 0) {
        await client
          .delete(bookmarkTags)
          .where(eq(bookmarkTags.bookmarkId, (toRemove[0] as { id: number }).id))
        await client
          .delete(bookmarks)
          .where(and(eq(bookmarks.userId, userId), eq(bookmarks.slug, slug)))
      }
      await refresh()
    },
    [userId, db, refresh],
  )

  const isBookmarked = useCallback(
    (slug: string) => items.some((b) => b.slug === slug),
    [items],
  )

  // Collection management
  const createCollection = useCallback(
    async (name: string, color?: string, icon?: string) => {
      if (!userId) throw new Error("Not authenticated")
      const client = await db()
      await client.insert(bookmarkCollections).values({
        userId,
        name,
        color: color ?? "#8b5cf6",
        icon: icon ?? "📁",
      })
      await refresh()
    },
    [userId, db, refresh],
  )

  const deleteCollection = useCallback(
    async (id: number) => {
      if (!userId) return
      const client = await db()
      // Unlink bookmarks in this collection
      await client
        .update(bookmarks)
        .set({ collectionId: null })
        .where(
          and(eq(bookmarks.userId, userId), eq(bookmarks.collectionId, id)),
        )
      await client
        .delete(bookmarkCollections)
        .where(
          and(eq(bookmarkCollections.userId, userId), eq(bookmarkCollections.id, id)),
        )
      await refresh()
    },
    [userId, db, refresh],
  )

  const addTag = useCallback(
    async (bookmarkId: number, tag: string) => {
      const client = await db()
      await client.insert(bookmarkTags).values({ bookmarkId, tag })
      await refresh()
    },
    [db, refresh],
  )

  const removeTag = useCallback(
    async (bookmarkId: number, tag: string) => {
      const client = await db()
      await client
        .delete(bookmarkTags)
        .where(
          and(eq(bookmarkTags.bookmarkId, bookmarkId), eq(bookmarkTags.tag, tag)),
        )
      await refresh()
    },
    [db, refresh],
  )

  // Rename a collection
  const renameCollection = useCallback(
    async (id: number, name: string) => {
      if (!userId) return
      const client = await db()
      await client
        .update(bookmarkCollections)
        .set({ name })
        .where(
          and(eq(bookmarkCollections.userId, userId), eq(bookmarkCollections.id, id)),
        )
      await refresh()
    },
    [userId, db, refresh],
  )

  // Update a collection's color/icon
  const updateCollection = useCallback(
    async (id: number, data: { color?: string; icon?: string }) => {
      if (!userId) return
      const client = await db()
      await client
        .update(bookmarkCollections)
        .set(data)
        .where(
          and(eq(bookmarkCollections.userId, userId), eq(bookmarkCollections.id, id)),
        )
      await refresh()
    },
    [userId, db, refresh],
  )

  // Reorder collections (set position for each)
  const reorderCollection = useCallback(
    async (orderedIds: number[]) => {
      if (!userId) return
      const client = await db()
      // Update position for each collection sequentially
      for (let i = 0; i < orderedIds.length; i++) {
        await client
          .update(bookmarkCollections)
          .set({ position: i })
          .where(
            and(
              eq(bookmarkCollections.userId, userId),
              eq(bookmarkCollections.id, orderedIds[i] as number),
            ),
          )
      }
      await refresh()
    },
    [userId, db, refresh],
  )

  // Bulk add bookmarks (move multiple to a collection, or tag all)
  const bulkAdd = useCallback(
    async (slug: string, data: { collectionId?: number }) => {
      if (!userId) return
      const client = await db()
      await client
        .update(bookmarks)
        .set({ collectionId: data.collectionId ?? null })
        .where(
          and(eq(bookmarks.userId, userId), eq(bookmarks.slug, slug)),
        )
      await refresh()
    },
    [userId, db, refresh],
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
