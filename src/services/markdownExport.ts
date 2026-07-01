// Markdown export service - converts wiki content to downloadable .md files

import TurndownService from "turndown"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  bulletListMarker: "-",
  linkStyle: "inlined",
})

// Preserve images
turndown.addRule("imageAlt", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLImageElement
    const alt = el.getAttribute("alt") ?? ""
    const src = el.getAttribute("src") ?? ""
    const title = el.getAttribute("title")
      ? ` "${el.getAttribute("title")}"`
      : ""
    return `![${alt}](${src}${title})`
  },
})

// Preserve code blocks
turndown.addRule("codeBlock", {
  filter: ["pre", "code"],
  replacement: (_content, node) => {
    const el = node as HTMLElement
    if (el.tagName === "PRE") {
      const lang =
        el.querySelector("code")?.className.replace(/^language-/, "") ?? ""
      const code = el.textContent ?? ""
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`
    }
    const code = el.textContent ?? ""
    return `\`${code}\``
  },
})

// Convert tables to markdown
turndown.addRule("table", {
  filter: "table",
  replacement: (_content, node) => {
    const rows = node.querySelectorAll("tr")
    const mdRows: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const cells = row.querySelectorAll("td, th")
      const mdCells: string[] = []
      for (const cell of cells) {
        mdCells.push(` ${cell.textContent?.trim() ?? ""} `)
      }
      mdRows.push(`|${mdCells.join("|")}|`)
      if (i === 0) {
        // Header separator
        mdRows.push(`|${mdCells.map(() => " --- ").join("|")}|`)
      }
    }
    return `\n${mdRows.join("\n")}\n`
  },
})

/**
 * Convert HTML content to Markdown string.
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html)
}

/**
 * Trigger a file download in the browser.
 */
export function downloadMarkdown(
  content: string,
  filename: string,
): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copy plain text content to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand("copy")
    document.body.removeChild(textarea)
    return result
  }
}

/**
 * Strip HTML tags and return plain text content.
 */
export function htmlToPlainText(html: string): string {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.textContent ?? ""
}
