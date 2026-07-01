// Content formatter for Wikipedia HTML: cleans, themes, and enhances content

export interface FormattedContent {
  /** Cleaned HTML ready for rendering */
  html: string
  /** Array of LaTeX expressions found (for KaTeX) */
  latexExpressions: Array<{ raw: string; display: boolean }>
  /** Array of image URLs found (for lightbox/gallery) */
  images: string[]
  /** Array of external URLs found (for preview) */
  externalUrls: string[]
  /** Table of contents entries */
  toc: Array<{ id: string; title: string; level: number }>
}

/**
 * Process raw Wikipedia HTML into enhanced, theme-compatible content.
 */
export function formatWikiContent(rawHtml: string): FormattedContent {
  let html = rawHtml
  const latexExpressions: FormattedContent["latexExpressions"] = []
  const images: string[] = []
  const externalUrls: string[] = []
  const toc: FormattedContent["toc"] = []

  // 1. Remove edit section links
  html = html.replace(
    /<span[^>]*class="mw-editsection"[^>]*>.*?<\/span>/gi,
    "",
  )

  // 2. Remove empty elements
  html = html.replace(/<div[^>]*class="mw-empty-elt"[^>]*>\s*<\/div>/gi, "")

  // 3. Remove hidden/noprint elements
  html = html.replace(
    /<[a-z]+[^>]*class="[^"]*\b(?:noprint|mw-empty-elt|sistertable|mbox-small|navbox|navbar|rellink|metadata)\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi,
    (match) => {
      // Don't remove infoboxes or thumbnails
      if (
        /\b(?:infobox|thumb|toc|gallery)\b/i.test(match)
      )
        return match
      return ""
    },
  )

  // 4. Remove hatnotes (short description banners) but keep their text
  html = html.replace(
    /<div[^>]*class="[^"]*\bhatnote\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    "",
  )

  // 5. Extract LaTeX expressions from <math> tags
  html = html.replace(
    /<math[^>]*>\s*(.*?)\s*<\/math>/gi,
    (_match, content: string) => {
      const isDisplay = _match.includes('display="block"') || _match.includes("displaystyle")
      latexExpressions.push({ raw: content, display: isDisplay })
      // Replace with a placeholder div that KaTeX will render into
      const idx = latexExpressions.length - 1
      return `<span class="wiki-latex" data-latex-index="${idx}">[LaTeX]</span>`
    },
  )

  // 6. Enhance images
  html = html.replace(
    /<img[^>]+src="([^"]+)"[^>]*>/gi,
    (match, src: string) => {
      // Normalize protocol-relative URLs
      let fullSrc = src
      if (fullSrc.startsWith("//")) fullSrc = `https:${fullSrc}`
      if (!fullSrc.startsWith("http")) return match

      // Track it
      images.push(fullSrc)

      // Get a high-res version and add data attributes
      const highRes = fullSrc.replace(
        /\/(\d+)px-/,
        (_s: string, px: string) => {
          // Request 2x size for retina
          return `/${Math.min(Number.parseInt(px) * 2, 1920)}px-`
        },
      )

      // Add our classes and attributes for enhanced display
      const enhanced = match
        .replace(/<img /, '<img loading="lazy" ')
        .replace(
          /\/>$/,
          `data-full="${highRes}" data-enlargable="1" />`,
        )
        // Replace src with slightly smaller version for initial load
        .replace(
          src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          fullSrc.replace(/\/\d+px-/, "/480px-"),
        )
      return enhanced
    },
  )

  // 7. Extract and enhance external links
  html = html.replace(
    /<a\s+([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_match, before: string, url: string, after: string) => {
      // Skip internal Wikipedia links
      if (
        url.includes(".wikipedia.org") ||
        url.includes("wikimedia.org") ||
        url.includes("wikidata.org")
      ) {
        // Still process wikipedia cross-lang links
        if (!url.includes("/wiki/")) return _match
        return `<a ${before} href="${url}"${after}>`
      }

      externalUrls.push(url)

      // Add external link icon and preview attributes
      return `<a ${before} href="${url}"${after} class="external-link" data-url="${url}">`
    },
  )

  // 8. Enhance tables with our classes
  html = html.replace(
    /<table[^>]*class="[^"]*(?:wikitable|infobox)[^"]*"[^>]*>/gi,
    (match) => {
      if (match.includes('class="wikitable')) {
        return match.replace(
          /class="/,
          'class="wiki-table wiki-data-table ',
        )
      }
      if (match.includes('class="infobox')) {
        return match.replace(
          /class="/,
          'class="wiki-infobox ',
        )
      }
      return match
    },
  )

  // 9. Convert regular tables
  html = html.replace(
    /<table(?![^>]*class=)[^>]*>/gi,
    (match) => {
      // Only enhance if it has rows
      return match.replace(/<table/, '<table class="wiki-table"')
    },
  )

  // 10. Enhance thumbnails and captions
  html = html.replace(/class="thumb"/gi, 'class="wiki-thumb"')
  html = html.replace(/class="thumbinner"/gi, 'class="wiki-thumb-inner"')
  html = html.replace(/class="thumbcaption"/gi, 'class="wiki-thumb-caption"')
  html = html.replace(/class="gallery"/gi, 'class="wiki-gallery"')

  // 11. Extract TOC from the table of contents
  const tocMatch = html.match(
    /<div[^>]*id="toc"[^>]*>[\s\S]*?<\/div>\s*<\/div>/i,
  )
  if (tocMatch) {
    const tocHtml = tocMatch[0]
    const tocItemRegex = /<a[^>]*href="#([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="toctext"[^>]*>([^<]+)<\/span>/gi
    let tocMatch2
    while ((tocMatch2 = tocItemRegex.exec(tocHtml)) !== null) {
      const id = tocMatch2[1] ?? ""
      const title = tocMatch2[2] ?? ""
      toc.push({ id, title, level: 2 })
    }
    // Remove the built-in TOC since we'll use our own
    html = html.replace(
      /<div[^>]*id="toc"[^>]*>[\s\S]*?<\/div>\s*<\/div>/i,
      '<div id="wiki-toc-placeholder"></div>',
    )
  }

  // 12. Add heading IDs if missing
  html = html.replace(
    /<(h[2-4])([^>]*)>(.*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, content: string) => {
      if (attrs.includes("id=")) return _match
      const id = content
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`
    },
  )

  // 13. Style code blocks
  html = html.replace(
    /<pre[^>]*>/gi,
    '<pre class="wiki-code-block">',
  )
  html = html.replace(
    /<code[^>]*>/gi,
    (match) => {
      if (match.includes("class=")) return match
      return '<code class="wiki-inline-code">'
    },
  )

  // 14. Style blockquotes
  html = html.replace(
    /<blockquote[^>]*>/gi,
    '<blockquote class="wiki-blockquote">',
  )

  // 15. Remove bottom reference/notes sections and other "useless" sections
  const sectionsToRemove = [
    "References",
    "Notes",
    "Bibliography",
    "Further reading",
    "External links",
    "Navigation",
    "Sources",
    "Citations",
    "Footnotes",
    "Explanatory notes",
    "Notes and references",
    "References and further reading",
  ]
  html = stripSections(html, sectionsToRemove)

  // 16. Remove Wikipedia edit buttons, annotation markers, and metadata badges
  html = html
    // Edit section links (by class) — multiline-safe
    .replace(/<span[^>]*class="mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "")
    // Edit section links (by <a> with edit action in href) — multiline-safe
    .replace(/<a[^>]*href="[^"]*\b(?:action=edit|veaction=edit)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
    // Edit links in visual mode — multiline-safe
    .replace(/<a[^>]*class="mw-editsection-visualeditor"[^>]*>[\s\S]*?<\/a>/gi, "")
    // Catch-all: any remaining <a> that smells like an edit link
    .replace(/<a[^>]*\b(?:edit|veaction)[^>]*>[\s\S]*?<\/a>/gi, "")
    // Strip any plain-text URLs containing action=edit or veaction=edit
    .replace(/https?:\/\/[^\s<>"']*\b(?:action=edit|veaction=edit)[^\s<>"']*/gi, "")
    // Hatnotes / short description banners
    .replace(/<div[^>]*class="[^"]*\b(?:hatnote|dablink|rellink)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    // Metadata boxes (navbar, noprint, sister projects)
    .replace(
      /<(?:div|table|tr)[^>]*class="[^"]*\b(?:noprint|metadata|sistertable|mbox-small|navbox|navbar|reflist|refbegin)\b[^"]*"[^>]*>[\s\S]*?<\/(?:div|table|tr)>/gi,
      "",
    )
    // Coordinate links
    .replace(/<span[^>]*class="geo[^"]*"[^>]*>.*?<\/span>/gi, "")
    // Page status indicators (good article, featured etc)
    .replace(/<div[^>]*id="mw-indicator-sd-"[^>]*>[\s\S]*?<\/div>/gi, "")
    // All indicators generally (bottom badges)
    .replace(/<li[^>]*id="[^"]*pagehistory"[^>]*>[\s\S]*?<\/li>/gi, "")

  // 17. Remove empty anchor elements (annotations / backlinks for refs)
  html = html.replace(/<a[^>]*class="mw-headline-anchor"[^>]*><\/a>/gi, "")
  // Remove reference backlink markers (<sup> with class reference)
  html = html.replace(
    /<sup[^>]*class="reference"[^>]*>[\s\S]*?<\/sup>/gi,
    "",
  )
  // Remove cite error / cite notice blocks
  html = html.replace(
    /<(?:div|span|p)[^>]*class="[^"]*\b(?:cite-error|cite-notice|mw-ext-cite-error)\b[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|p)>/gi,
    "",
  )

  // 18. Wrap the content in a wiki-content container
  html = `<div class="wiki-content">${html}</div>`

  return { html, latexExpressions, images, externalUrls, toc }
}

/**
 * Remove entire sections whose heading matches any name in `namesToRemove`.
 * A section is: <h2>…heading…</h2> followed by everything until the next <h2>
 * (or end of content).
 */
function stripSections(html: string, namesToRemove: string[]): string {
  const pattern = namesToRemove
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")

  if (!pattern) return html

  const regex = new RegExp(
    `<h[2-4][^>]*>\\s*<span[^>]*id="[^"]*"?[^"]*"?\\s*><\\/span>\\s*<span[^>]*class="mw-headline"[^>]*>(?:${pattern})<\\/span>\\s*<\\/h[2-4]>[\\s\\S]*?(?=<h[2-4]\\b|$)`,
    "gi",
  )

  return html.replace(regex, "")
}


