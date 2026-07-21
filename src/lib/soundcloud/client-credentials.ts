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

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an access token using the Client Credentials flow.
 * Throws loudly when official credentials are not configured.
 */
export async function getClientCredentialsToken(): Promise<string> {
  // Return cached token if still valid (1min safety buffer)
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get client credentials token: ${error}`);
  }

  const data: ClientCredentialsToken = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Check if official client credentials are configured.
 */
export function hasClientCredentials(): boolean {
  return getOfficialCredentials() !== null;
}

/**
 * Test-only helper to reset the module-level token cache.
 */
export function resetTokenCacheForTesting(): void {
  cachedToken = null;
}
