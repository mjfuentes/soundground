/**
 * SoundCloud Client Credentials Flow
 * For accessing public resources without user authentication
 * https://developers.soundcloud.com/docs/api/guide#client-credentials
 */

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID";
const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;

interface ClientCredentialsToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get access token using Client Credentials flow
 * Token is cached and automatically refreshed when expired
 */
export async function getClientCredentialsToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) { // 1min buffer
    return cachedToken.token;
  }

  // Check if we have client_secret configured
  if (!SOUNDCLOUD_CLIENT_SECRET || SOUNDCLOUD_CLIENT_SECRET === "your_client_secret_here") {
    throw new Error("SOUNDCLOUD_CLIENT_SECRET not configured. Using fallback to client_id only.");
  }

  // Generate Basic Auth header
  const credentials = Buffer.from(`${SOUNDCLOUD_CLIENT_ID}:${SOUNDCLOUD_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: {
      "Accept": "application/json; charset=utf-8",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get client credentials token: ${error}`);
  }

  const data: ClientCredentialsToken = await response.json();

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

/**
 * Check if client credentials are configured
 */
export function hasClientCredentials(): boolean {
  return !!(SOUNDCLOUD_CLIENT_SECRET && SOUNDCLOUD_CLIENT_SECRET !== "your_client_secret_here");
}

