/**
 * Smart client — the single facade the app's API routes talk to.
 *
 * Provider selection, checked lazily per call:
 *   1. OFFICIAL API (api.soundcloud.com) when SOUNDCLOUD_CLIENT_ID +
 *      SOUNDCLOUD_CLIENT_SECRET are configured. This is the primary path.
 *   2. Unofficial api-v2 fallback when only SOUNDCLOUD_APIV2_CLIENT_ID
 *      is configured (opt-in, see ./client.ts).
 *   3. Neither configured -> SoundCloudNotConfiguredError. No silent
 *      fallbacks, no hardcoded credentials.
 *
 * Both providers are wrapped in the SQLite cache layer.
 */

import * as officialCachedClient from "./official-cached-client";
import * as apiV2CachedClient from "./cached-client";
import {
  hasApiV2ClientId,
  hasOfficialCredentials,
  SoundCloudNotConfiguredError,
} from "./config";

type Provider = typeof officialCachedClient | typeof apiV2CachedClient;

function getProvider(): Provider {
  if (hasOfficialCredentials()) {
    return officialCachedClient;
  }
  if (hasApiV2ClientId()) {
    return apiV2CachedClient;
  }
  throw new SoundCloudNotConfiguredError();
}

export async function resolveProfile(url: string) {
  return getProvider().resolveProfile(url);
}

/**
 * Spotlight only exists on api-v2. Use the fallback when it is configured
 * (even alongside official credentials); otherwise the section is empty.
 */
export async function getSpotlight(userId: number) {
  if (hasApiV2ClientId()) {
    return apiV2CachedClient.getSpotlight(userId);
  }
  if (hasOfficialCredentials()) {
    return officialCachedClient.getSpotlight();
  }
  throw new SoundCloudNotConfiguredError();
}

export async function getPlaylists(userId: number, limit = 200) {
  return getProvider().getPlaylists(userId, limit);
}

export async function getAlbums(userId: number, limit = 200) {
  return getProvider().getAlbums(userId, limit);
}

export async function getTracks(userId: number, limit = 200) {
  return getProvider().getTracks(userId, limit);
}

export async function getReposts(userId: number, limit = 200) {
  return getProvider().getReposts(userId, limit);
}

export async function getTrack(trackId: number) {
  return getProvider().getTrack(trackId);
}

export async function getFollowers(userId: number, limit = 200, nextHref?: string) {
  return getProvider().getFollowers(userId, limit, nextHref);
}

export async function getFollowings(userId: number, limit = 200, nextHref?: string) {
  return getProvider().getFollowings(userId, limit, nextHref);
}

export async function getPlaylistWithTracks(playlistId: number) {
  return getProvider().getPlaylistWithTracks(playlistId);
}

export async function search(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filter?: 'tracks' | 'users' | 'playlists' | 'albums';
  } = {}
) {
  return getProvider().search(query, options);
}

/**
 * Streamable URLs via the official API (/tracks/{urn}/streams).
 * Only available on the official provider — the stream route falls back to
 * api-v2 transcodings itself when official credentials are absent.
 */
export async function getTrackStreams(trackId: number) {
  if (!hasOfficialCredentials()) {
    throw new SoundCloudNotConfiguredError();
  }
  return officialCachedClient.getTrackStreams(trackId);
}

export { hasApiV2ClientId, hasOfficialCredentials } from "./config";

// Re-export types
export type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SpotlightItem,
  SoundCloudSearchResult,
} from "./client";

export { isPlaylist } from "./client";
