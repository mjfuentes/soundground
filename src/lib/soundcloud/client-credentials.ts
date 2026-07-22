/**
 * SoundCloud Client Credentials Flow (official API)
 * For accessing public resources without user authentication.
 * https://developers.soundcloud.com/docs/api/guide#client-credentials
 *
 * Tokens are cached for their lifetime and refreshed on expiry. SoundCloud
 * rate-limits token minting (50 per 12h per app), so the cache matters.
 */

import { getOfficialCredentials, OFFICIAL_TOKEN_URL } from "./config";

interface ClientCredentialsToken {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Two cache tiers, because SoundCloud caps minting at 50 per 12h per app:
// - globalThis: dev route bundles can each get their own module copy
// - cache.db: SHARED ACROSS PROCESSES — the dev server, crawler CLI,
//   aggregation scripts and builds all reuse one mint instead of each
//   minting their own (which is how the cap got hit on day one).
const TOKEN_CACHE_KEY = Symbol.for("soundground.sc-token-cache");
const TOKEN_DB_KEY = "official:client-credentials-token";

function getCachedToken(): CachedToken | null {
  const inMemory = (globalThis as Record<symbol, unknown>)[TOKEN_CACHE_KEY] as
    | CachedToken
    | null
    | undefined;
  if (inMemory) return inMemory;
  try {
    // Lazy require avoids a module cycle (cache -> soundcloud is never imported).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCacheService } = require("@/lib/cache") as typeof import("@/lib/cache");
    const persisted = getCacheService().get<CachedToken>(TOKEN_DB_KEY);
    if (persisted) {
      (globalThis as Record<symbol, unknown>)[TOKEN_CACHE_KEY] = persisted;
      return persisted;
    }
  } catch {
    // cache.db unavailable (e.g. read-only env) — in-memory tier still works
  }
  return null;
}

function setCachedToken(token: CachedToken | null): void {
  (globalThis as Record<symbol, unknown>)[TOKEN_CACHE_KEY] = token;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCacheService } = require("@/lib/cache") as typeof import("@/lib/cache");
    if (token) {
      getCacheService().set(TOKEN_DB_KEY, token, {
        ttl: Math.max(0, token.expiresAt - Date.now()),
        type: "auth:token",
      });
    } else {
      getCacheService().delete(TOKEN_DB_KEY);
    }
  } catch {
    // best effort — persistence is an optimization
  }
}

/**
 * Get an access token using the Client Credentials flow.
 * Throws loudly when official credentials are not configured.
 */
export async function getClientCredentialsToken(): Promise<string> {
  // Return cached token if still valid (1min safety buffer)
  const cachedToken = getCachedToken();
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const credentials = getOfficialCredentials();
  if (!credentials) {
    throw new Error(
      "SOUNDCLOUD_CLIENT_ID / SOUNDCLOUD_CLIENT_SECRET are not configured. " +
        "Register the app at https://developers.soundcloud.com/docs/api/register-app " +
        "and set them in the environment. See .env.example."
    );
  }

  const basicAuth = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`
  ).toString("base64");

  const response = await fetch(OFFICIAL_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json; charset=utf-8",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get client credentials token: ${error}`);
  }

  const data: ClientCredentialsToken = await response.json();

  setCachedToken({
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

/**
 * Check if official client credentials are configured.
 */
export function hasClientCredentials(): boolean {
  return getOfficialCredentials() !== null;
}

/**
 * Test-only helper to reset the token cache.
 */
export function resetTokenCacheForTesting(): void {
  setCachedToken(null);
}
