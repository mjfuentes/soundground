/**
 * SoundCloud API configuration.
 *
 * Credentials are read lazily from the environment so that importing any
 * client module never throws at build time — but every actual API call
 * fails loudly, with a clear message, when nothing is configured.
 * There are NO hardcoded fallback credentials. See .env.example.
 */

export const OFFICIAL_API_BASE = "https://api.soundcloud.com";
export const OFFICIAL_TOKEN_URL = "https://secure.soundcloud.com/oauth/token";
export const APIV2_API_BASE = "https://api-v2.soundcloud.com";

export interface OfficialCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Official API credentials (from the registered app at
 * developers.soundcloud.com). Returns null when not configured.
 */
export function getOfficialCredentials(): OfficialCredentials | null {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

export function hasOfficialCredentials(): boolean {
  return getOfficialCredentials() !== null;
}

/**
 * Opt-in client_id for the unofficial api-v2 fallback. This is NOT an
 * official credential — it is a web client_id you supply yourself.
 * Returns null when not configured (fallback disabled).
 */
export function getApiV2ClientId(): string | null {
  return process.env.SOUNDCLOUD_APIV2_CLIENT_ID || null;
}

export function hasApiV2ClientId(): boolean {
  return getApiV2ClientId() !== null;
}

/**
 * Error thrown when no SoundCloud data source is configured at all.
 */
export class SoundCloudNotConfiguredError extends Error {
  constructor() {
    super(
      "No SoundCloud API credentials configured. Set SOUNDCLOUD_CLIENT_ID and " +
        "SOUNDCLOUD_CLIENT_SECRET (official API, preferred) or " +
        "SOUNDCLOUD_APIV2_CLIENT_ID (unofficial api-v2 fallback) in the " +
        "environment. See .env.example."
    );
    this.name = "SoundCloudNotConfiguredError";
  }
}
