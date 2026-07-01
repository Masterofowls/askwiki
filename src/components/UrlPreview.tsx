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
      const u = new URL(url)
      const hostname = u.hostname

      // For Wikipedia URLs, use the Wikipedia API directly
      if (hostname === "en.wikipedia.org" || hostname.endsWith(".wikipedia.org")) {
        const pageTitle = u.pathname.replace("/wiki/", "").replace(/_/g, " ")
        const apiUrl = `https://${hostname}/w/api.php?action=query&titles=${encodeURIComponent(decodeURIComponent(pageTitle))}&prop=extracts|pageimages|info&exintro&explaintext&exchars=300&pithumbsize=300&format=json&origin=*`
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) })
        const data = await resp.json()
        const pages = data.query?.pages as Record<string, { title?: string; extract?: string; thumbnail?: { source?: string } }> | undefined
        if (pages) {
          const page = Object.values(pages)[0]
          if (page?.extract) {
            setPreview({
              title: page.title ?? decodeURIComponent(pageTitle),
              description: page.extract.slice(0, 300).replace(/\n/g, " "),
              image: page.thumbnail?.source ?? null,
              siteName: "Wikipedia",
              favicon: `https://${hostname}/favicon.ico`,
            })
            return
          }
        }
      }

      // Fallback: show hostname info (avoids CORS proxy entirely)
      setPreview({
        title: decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? u.hostname),
        description: u.href,
        image: null,
        siteName: hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
      })
    } catch {
      setPreview(null)
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
