/// <reference types="vite/client" />

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "@/db/schema"

export function createDb(token: string) {
  const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL
  if (!dataApiUrl) {
    throw new Error("VITE_NEON_DATA_API_URL is required — set it in .env")
  }

  const sql = neon(dataApiUrl, { authToken: token })
  return drizzle(sql, { schema })
}
