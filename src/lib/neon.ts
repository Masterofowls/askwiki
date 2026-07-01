/// <reference types="vite/client" />

import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "@/db/schema"

/**
 * Parses a Neon Data API URL into its host part.
 *
 * Input:  "https://<project>.apirest.neon.tech/neondb/rest/v1"
 * Output: "<project>.apirest.neon.tech"
 */
function parseHostFromDataApiUrl(dataApiUrl: string): string {
  const u = new URL(dataApiUrl)
  return u.host
}

export function createDb(token: string) {
  const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL
  if (!dataApiUrl) {
    throw new Error("VITE_NEON_DATA_API_URL is required — set it in .env")
  }

  // The neon() function expects a postgresql:// connection string, NOT a Data API URL.
  // We construct a valid-format connection string from the host, then use
  // neonConfig.fetchEndpoint to route traffic to the correct Neon SQL endpoint.
  const host = parseHostFromDataApiUrl(dataApiUrl)
  neonConfig.fetchEndpoint = `https://${host}/sql`

  // Build a connection string that passes the library's format validation.
  // Authentication happens via the JWT authToken, not the password in this string.
  const connectionString = `postgresql://neondb_owner:placeholder@${host}/neondb`

  const sql = neon(connectionString, { authToken: token })
  return drizzle(sql, { schema })
}
