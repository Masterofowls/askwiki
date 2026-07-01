#!/usr/bin/env node
/**
 * AskWiki MCP Server
 *
 * Exposes Wikipedia search and read tools via the Model Context Protocol
 * so AI assistants (Claude, etc.) can query wiki content directly.
 *
 * Usage:
 *   npx tsx mcp-server.ts
 *
 * Or add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "askwiki": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/askwiki/mcp-server.ts"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// ── Wikipedia API helpers (standalone, no Vite deps) ─────────────

interface WikiSearchResult {
  title: string
  snippet: string
  pageId: number
  url: string
}

interface WikiPageData {
  title: string
  displayTitle: string
  summary: string
  html: string
  imageUrl: string | null
  categories: string[]
  wikiUrl: string
}

async function searchWiki(
  query: string,
  limit = 10,
  lang = "en",
): Promise<WikiSearchResult[]> {
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php`
  const url = `${apiUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`API error: ${data.error.info}`)

  return (data.query?.search ?? []).map((r: Record<string, unknown>) => ({
    title: r.title as string,
    snippet: (r.snippet as string)?.replace(/<[^>]+>/g, ""),
    pageId: r.pageid as number,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title as string).replace(/%20/g, "_")}`,
  }))
}

async function fetchWikiPage(
  title: string,
  lang = "en",
): Promise<WikiPageData> {
  const baseUrl = `https://${lang}.wikipedia.org`

  // Summary via REST API
  const restUrl = `${baseUrl}/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const restRes = await fetch(restUrl)
  let summaryMeta: Record<string, unknown> | null = null
  if (restRes.ok) {
    summaryMeta = await restRes.json()
  }

  // Full HTML via parse API
  const apiUrl = `${baseUrl}/w/api.php`
  const parseUrl = `${apiUrl}?action=parse&page=${encodeURIComponent(title)}&prop=text|images|categories&format=json&origin=*&disablelimitreport=1`
  const parseRes = await fetch(parseUrl)
  if (!parseRes.ok) throw new Error(`Parse API error: ${parseRes.status}`)
  const parseData = await parseRes.json()
  if (parseData.error) throw new Error(`API error: ${parseData.error.info}`)

  const page = parseData.parse
  const rawHtml = (page.text["*"] as string) ?? ""

  // Extract main content
  const contentMatch = rawHtml.match(
    /<div\s+(?:[^>]*?\s+)?id="mw-parser-output"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--\s*end\s+of\s+parser\s+output\s*-->)?\s*$/i,
  )
  const contentHtml = contentMatch?.[1] ?? rawHtml

  // Clean up
  const cleaned = contentHtml
    .replace(/<span[^>]*class="mw-editsection[^"]*"[^>]*>.*?<\/span>/gi, "")
    .replace(/<sup[^>]*class="reference"[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(
      /<(?:div|table)[^>]*class="[^"]*\b(?:noprint|navbox|navbar|reflist|metadata|sistertable)\b[^"]*"[^>]*>[\s\S]*?<\/(?:div|table)>/gi,
      "",
    )

  const imageUrl =
    (summaryMeta?.thumbnail as Record<string, unknown>)?.source as string ??
    (summaryMeta?.pageImage as string) ??
    null

  const categories: string[] = (page.categories ?? [])
    .map((c: Record<string, unknown>) => (c["*"] as string)?.replace(/^Category:/, ""))
    .filter((c: string) => !c.includes("Hidden") && !c.includes("Articles"))

  return {
    title: (summaryMeta?.title as string) ?? (page.title as string) ?? title,
    displayTitle: (summaryMeta?.title as string) ?? (page.title as string) ?? title,
    summary: (summaryMeta?.extract as string) ?? "",
    html: cleaned,
    imageUrl,
    categories: categories.slice(0, 20),
    wikiUrl: `${baseUrl}/wiki/${encodeURIComponent(title).replace(/%20/g, "_")}`,
  }
}

// ── MCP Server ──────────────────────────────────────────────────

const server = new Server(
  {
    name: "askwiki",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_wiki",
      description: "Search Wikipedia for pages matching a query",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default 10)", default: 10 },
          lang: { type: "string", description: "Language code (default en)", default: "en" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_wiki_page",
      description: "Fetch the full content of a Wikipedia page",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Page title (e.g. 'Artificial intelligence')" },
          lang: { type: "string", description: "Language code (default en)", default: "en" },
        },
        required: ["title"],
      },
    },
    {
      name: "get_wiki_summary",
      description: "Get a concise summary of a Wikipedia page (no HTML)",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Page title" },
          lang: { type: "string", description: "Language code (default en)", default: "en" },
        },
        required: ["title"],
      },
    },
  ],
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "search_wiki": {
        const query = String(args?.query ?? "")
        const limit = Number(args?.limit ?? 10)
        const lang = String(args?.lang ?? "en")
        const results = await searchWiki(query, limit, lang)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                results.map((r) => ({
                  title: r.title,
                  snippet: r.snippet.slice(0, 300),
                  url: r.url,
                })),
                null,
                2,
              ),
            },
          ],
        }
      }

      case "get_wiki_page": {
        const title = String(args?.title ?? "")
        const lang = String(args?.lang ?? "en")
        const page = await fetchWikiPage(title, lang)

        // Strip HTML tags for a clean text version
        const textContent = page.html
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()

        return {
          content: [
            {
              type: "text",
              text: [
                `# ${page.displayTitle}`,
                "",
                page.summary ? `${page.summary}\n` : "",
                textContent.slice(0, 50000), // Limit to 50k chars
                "",
                `---`,
                `Source: ${page.wikiUrl}`,
                page.categories.length > 0
                  ? `Categories: ${page.categories.join(", ")}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        }
      }

      case "get_wiki_summary": {
        const sTitle = String(args?.title ?? "")
        const sLang = String(args?.lang ?? "en")
        const sPage = await fetchWikiPage(sTitle, sLang)
        return {
          content: [
            {
              type: "text",
              text: [
                `# ${sPage.displayTitle}`,
                "",
                sPage.summary,
                "",
                `Categories: ${sPage.categories.slice(0, 10).join(", ")}`,
                `Read more: ${sPage.wikiUrl}`,
              ].join("\n"),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    }
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // eslint-disable-next-line no-console
  console.error("AskWiki MCP server running on stdio")
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err)
  process.exit(1)
})
