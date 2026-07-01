import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null)
      }
    })
  }

  function handleDismiss() {
    setDismissed(true)
  }

  if (!deferredPrompt || dismissed) return null

  return (
    <div className="pwa-install-toast">
      <p>📲 Install AskWiki for offline access</p>
      <button onClick={handleInstall}>Install</button>
      <button className="pwa-dismiss" onClick={handleDismiss}>
        ✕
      </button>
    </div>
  )
}