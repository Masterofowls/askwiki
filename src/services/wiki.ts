// Wikipedia / MediaWiki API service
// Supports any wiki running the MediaWiki API (wikipedia.org, wikimedia.org, etc.)

import { cachePage, getCachedPage } from "./pageCache"

export interface WikiSearchResult {
  title: string
  snippet: string
  pageId: number
  url: string
}

export interface WikiPageData {
  title: string
  displayTitle: string
  summary: string
  html: string
  imageUrl: string | null
  categories: string[]
  links: string[]
  wikiUrl: string
}

export interface WikiMeta {
  title: string
  extract: string
  thumbnail?: { source: string; width: number; height: number }
  pageImage?: string
  lang: string
  wikiBaseUrl: string
}

/**
 * Parse a Wikipedia/MediaWiki URL into its components.
 * Supports:
 *   https://en.wikipedia.org/wiki/Page_Title
 *   https://fr.wikipedia.org/wiki/Page_Title
 *   https://commons.wikimedia.org/wiki/Category:Things
 *   https://wiki.archlinux.org/title/Page  (non-standard)
 *   Just "Page_Title" (assumes English Wikipedia)
 */
export function parseWikiUrl(input: string): {
  baseUrl: string
  title: string
  lang: string
} {
  // Strip protocol
  const cleaned = input.trim()

  // Try to extract from full URL
  const urlMatch = cleaned.match(
    /^(?:https?:\/\/)?(?:([a-z-]+)\.)?(wikipedia\.org|wikimedia\.org|mediawiki\.org)\/wiki\/(.+)$/i,
  )
  if (urlMatch) {
    const lang = (urlMatch[1] || "en").toLowerCase()
    const title = decodeURIComponent(urlMatch[3] ?? "").replace(/_/g, " ")
    const domain = urlMatch[2]
    const baseUrl = `https://${lang}.${domain ?? "wikipedia.org"}`
    return { baseUrl, title, lang }
  }

  // Try simple "wiki.whatever.org/title/Page" pattern
  const altMatch = cleaned.match(
    /^(?:https?:\/\/)?([^/]+)\/title\/(.+)$/i,
  )
  if (altMatch) {
    const baseUrl = `https://${altMatch[1] ?? ""}`
    const title = decodeURIComponent(altMatch[2] ?? "").replace(/_/g, " ")
    return { baseUrl, title, lang: "en" }
  }

  // Assume it's a page title for English Wikipedia
  return {
    baseUrl: "https://en.wikipedia.org",
    title: cleaned.replace(/_/g, " ").replace(/^\/wiki\//, ""),
    lang: "en",
  }
}

/**
 * Search Wikipedia for pages matching the query.
 */
export async function searchWiki(
  query: string,
  limit = 20,
  lang = "en",
): Promise<WikiSearchResult[]> {
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php`
  const url = `${apiUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`API error: ${data.error.info}`)

  const results = data.query?.search ?? []
  return results.map((r: Record<string, unknown>) => ({
    title: r.title as string,
    snippet: (r.snippet as string)?.replace(/<[^>]+>/g, ""),
    pageId: r.pageid as number,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title as string).replace(/%20/g, "_")}`,
  }))
}

/**
 * Fetch a complete Wikipedia page using the MediaWiki parse API.
 * Returns cleaned HTML content with metadata.
 */
export async function fetchWikiPage(
  title: string,
  lang = "en",
  baseUrl = `https://${lang}.wikipedia.org`,
): Promise<WikiPageData> {
  // Try cache first
  const cached = getCachedPage(lang, title)
  if (cached) return cached

  // First, get the summary via REST API for quick metadata
  const restUrl = `${baseUrl}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const restRes = await fetch(restUrl)
  if (!restRes.ok && restRes.status !== 404) {
    throw new Error(`Summary API error: ${restRes.status}`)
  }

  let summaryMeta: WikiMeta | null = null
  if (restRes.ok) {
    summaryMeta = await restRes.json()
  }

  // Get full HTML via parse API
  const apiUrl = `${baseUrl}/w/api.php`
  const parseUrl = `${apiUrl}?action=parse&page=${encodeURIComponent(title)}&prop=text|images|links|categories&format=json&origin=*&disablelimitreport=1`
  const parseRes = await fetch(parseUrl)
  if (!parseRes.ok) throw new Error(`Parse API error: ${parseRes.status}`)
  const parseData = await parseRes.json()
  if (parseData.error) throw new Error(`API error: ${parseData.error.info}`)

  const page = parseData.parse
  const html = page.text["*"] as string

  // Extract just the main content area
  const contentHtml = extractMainContent(html)

  const imageUrl =
    summaryMeta?.thumbnail?.source ??
    summaryMeta?.pageImage ??
    extractFirstImage(html) ??
    null

  const categories: string[] = (page.categories ?? [])
    .map((c: Record<string, unknown>) => (c["*"] as string)?.replace(/^Category:/, ""))
    .filter((c: string) => !c.includes("Hidden") && !c.includes("Articles") && !c.includes("CS1"))

  const links: string[] = (page.links ?? [])
    .slice(0, 50)
    .map((l: Record<string, unknown>) => l["*"] as string)
    .filter(Boolean)

  const result: WikiPageData = {
    title: summaryMeta?.title ?? page.title ?? title,
    displayTitle: summaryMeta?.title ?? page.title ?? title,
    summary: summaryMeta?.extract ?? "",
    html: contentHtml,
    imageUrl,
    categories: categories.slice(0, 20),
    links: links.slice(0, 50),
    wikiUrl: `${baseUrl}/wiki/${encodeURIComponent(title).replace(/%20/g, "_")}`,
  }

  // Store in local cache for future visits
  cachePage(lang, title, result)

  return result
}

/**
 * Extract the main article content (#mw-parser-output div) from full page HTML.
 */
function extractMainContent(html: string): string {
  // Try to get the parser output div
  const match = html.match(
    /<div\s+(?:[^>]*?\s+)?id="mw-parser-output"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--\s*end\s+of\s+parser\s+output\s*-->)?\s*$/i,
  )
  if (match?.[1]) return match[1]

  // Fallback: try class-based match
  const classMatch = html.match(
    /<div\s+class="mw-parser-output[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  )
  if (classMatch?.[1]) return classMatch[1]

  // Last resort: return the whole thing
  return html
}

/**
 * Extract the first image URL from page HTML.
 */
function extractFirstImage(html: string): string | null {
  const imgMatch = html.match(
    /<img[^>]+src="(?:https?:)?\/\/upload\.wikimedia\.org\/[^"]+\.(?:jpg|jpeg|png|gif|svg|webp)[^"]*"/i,
  )
  if (!imgMatch) return null
  const srcGroup = imgMatch[1]
  if (!srcGroup) return null
  let src = srcGroup
  if (src.startsWith("//")) src = `https:${src}`
  return src
}

/**
 * Get auto-complete suggestions for a search term.
 */
export async function autoComplete(
  query: string,
  lang = "en",
): Promise<string[]> {
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php`
  const url = `${apiUrl}?action=opensearch&search=${encodeURIComponent(query)}&limit=8&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return (data[1] ?? []) as string[]
}
