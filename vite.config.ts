import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import path from "node:path"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      cleanupOutdatedCaches: true,
      includeAssets: ["vite.svg"],
      manifest: {
        name: "AskWiki",
        short_name: "AskWiki",
        description: "A modern Wikipedia reader with offline support",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/vite.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z]+\.wikipedia\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "wikipedia-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "wikipedia-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
})
