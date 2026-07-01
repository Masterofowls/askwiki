import { useState, useCallback } from "react"

interface PreviewData {
  title: string
  description: string
  image: string | null
  siteName: string
  favicon: string | null
}

interface Position {
  x: number
  y: number
}

export function useUrlPreview() {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  const fetchPreview = useCallback(async (url: string) => {
    setLoadingPreview(true)
    try {
      // Try Open Graph via a simple fetch approach
      const resp = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(4000) },
      )
      const html = await resp.text()
      const doc = new DOMParser().parseFromString(html, "text/html")

      const title =
        doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
        doc.querySelector("title")?.textContent ??
        url
      const description =
        doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
        doc.querySelector('meta[name="description"]')?.getAttribute("content") ??
        ""
      const image =
        doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ??
        null
      const siteName =
        doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ??
        new URL(url).hostname
      const favicon =
        doc.querySelector('link[rel="icon"]')?.getAttribute("href") ??
        doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
        null

      setPreview({
        title,
        description,
        image: image ? makeAbsolute(url, image) : null,
        siteName,
        favicon: favicon ? makeAbsolute(url, favicon) : null,
      })
    } catch {
      // Fallback: use URL as title
      try {
        const u = new URL(url)
        setPreview({
          title: u.hostname + u.pathname,
          description: "",
          image: null,
          siteName: u.hostname,
          favicon: `https://${u.hostname}/favicon.ico`,
        })
      } catch {
        setPreview(null)
      }
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const show = useCallback(
    (url: string, x: number, y: number) => {
      if (hideTimer) clearTimeout(hideTimer)
      setPosition({ x, y })
      setVisible(true)
      fetchPreview(url)
    },
    [fetchPreview],
  )

  const hide = useCallback(() => {
    hideTimer = setTimeout(() => {
      setVisible(false)
      setPreview(null)
    }, 200)
  }, [])

  return { preview, position, visible, loading: loadingPreview, show, hide }
}

function makeAbsolute(base: string, relative: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

export function UrlPreviewCard({
  preview,
  position,
  visible,
}: {
  preview: PreviewData | null
  position: { x: number; y: number }
  visible: boolean
}) {
  if (!visible || !preview) return null

  const style: React.CSSProperties = {
    left: Math.min(position.x, window.innerWidth - 420),
    top: position.y + 12,
  }

  return (
    <div className="url-preview-overlay" style={style}>
      <div className="url-preview-card">
        {preview.image && (
          <img
            className="url-preview-image"
            src={preview.image}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none"
            }}
          />
        )}
        <div className="url-preview-body">
          <div className="url-preview-title">{preview.title}</div>
          {preview.description && (
            <div className="url-preview-description">{preview.description}</div>
          )}
          <div className="url-preview-site">
            {preview.favicon && (
              <img
                className="url-preview-site-icon"
                src={preview.favicon}
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none"
                }}
              />
            )}
            {preview.siteName}
          </div>
        </div>
      </div>
    </div>
  )
}
