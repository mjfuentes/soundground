import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID";
const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET || "";
const SOUNDCLOUD_REDIRECT_URI = process.env.SOUNDCLOUD_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface OAuthAuthorizationParams {
  authUrl: string;
  codeVerifier: string;
  state: string;
}

/**
 * Generate SoundCloud OAuth authorization URL with PKCE
 */
export function generateAuthorizationUrl(): OAuthAuthorizationParams {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    client_id: SOUNDCLOUD_CLIENT_ID,
    redirect_uri: SOUNDCLOUD_REDIRECT_URI,
    response_type: "code",
    scope: "non-expiring",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://api.soundcloud.com/connect?${params.toString()}`;

  return {
    authUrl,
    codeVerifier,
    state,
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    client_id: SOUNDCLOUD_CLIENT_ID,
    client_secret: SOUNDCLOUD_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: SOUNDCLOUD_REDIRECT_URI,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://api.soundcloud.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    client_id: SOUNDCLOUD_CLIENT_ID,
    client_secret: SOUNDCLOUD_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://api.soundcloud.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  return response.json();
}

/**
 * Get current user profile using access token
 */
export async function getCurrentUser(accessToken: string) {
  const response = await fetch("https://api-v2.soundcloud.com/me", {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get current user: ${error}`);
  }

  return response.json();
}

