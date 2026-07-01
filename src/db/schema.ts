import { pgTable, text, timestamp, serial, integer } from "drizzle-orm/pg-core"

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  wikiUrl: text("wiki_url"),
  imageUrl: text("image_url"),
  summary: text("summary"),
  collectionId: integer("collection_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const bookmarkCollections = pgTable("bookmark_collections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").default("#8b5cf6"),
  icon: text("icon").default("📁"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const bookmarkTags = pgTable("bookmark_tags", {
  id: serial("id").primaryKey(),
  bookmarkId: integer("bookmark_id").notNull(),
  tag: text("tag").notNull(),
})
