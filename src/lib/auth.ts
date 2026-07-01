/// <reference types="vite/client" />

import { createInternalNeonAuth } from "@neondatabase/neon-js/auth"
import type { ReactBetterAuthClient } from "@neondatabase/neon-js/auth"
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters"

const authUrl = import.meta.env.VITE_NEON_AUTH_URL
if (!authUrl) {
  throw new Error("VITE_NEON_AUTH_URL is required — set it in .env")
}

const _client = createInternalNeonAuth(authUrl, {
  adapter: BetterAuthReactAdapter(),
})

/*
  Type fix: @neondatabase/neon-js types _client.adapter as VanillaBetterAuthClient
  (based on better-auth/client's nanostores atoms), but at runtime 
  BetterAuthReactAdapter wraps atoms as callable React hooks (better-auth/react).

  ReactBetterAuthClient is the correct type. We cast through `unknown` because the
  static adapter type (atoms) differs structurally from the runtime type (hooks).
  This avoids TS2742 because ReactBetterAuthClient is imported from a direct
  dependency (@neondatabase/neon-js/auth), not inferred from transitive better-auth types.
*/
export const auth = _client.adapter as unknown as ReactBetterAuthClient
export const getJWTToken = _client.getJWTToken
