/**
 * Cached wrapper over the OFFICIAL SoundCloud API client.
 * Mirrors cached-client.ts (which wraps the api-v2 fallback client).
 * Cache keys are prefixed "official:" so the two providers never collide.
 */

import { getCacheService } from '@/lib/cache';
import * as client from './official-client';
import type {
  SoundCloudFollower,
  SoundCloudPlaylist,
  SoundCloudSearchResult,
  SoundCloudTrack,
  SoundCloudUser,
  SpotlightItem,
} from './client';

// Cache freshness windows (ms). Metadata additionally gets STALE_RETENTION:
// past freshness it is served instantly while a background refresh runs
// (stale-while-revalidate). Streams get none — their URLs are short-lived
// tokens and a stale one is a broken player.
const DAY = 24 * 60 * 60 * 1000;

const CACHE_TTL = {
  PROFILE: 1 * DAY, // metadata changes slowly; SWR refreshes on first visit past this
  PLAYLISTS: 3 * DAY,
  TRACKS: 3 * DAY, // tracks are rarely deleted; a day-stale track list is fine
  FOLLOWERS: 1 * DAY,
  SEARCH: 5 * 60 * 1000, // 5 minutes — search should stay current
  STREAMS: 30 * 60 * 1000, // 30 minutes
};

const STALE_RETENTION = 90 * DAY; // instantly servable for months; refreshed on access

const CACHE_TYPE = {
  PROFILE: 'soundcloud:profile',
  PLAYLISTS: 'soundcloud:playlists',
  TRACKS: 'soundcloud:tracks',
  FOLLOWERS: 'soundcloud:followers',
  SEARCH: 'soundcloud:search',
  STREAMS: 'soundcloud:streams',
};

export async function resolveProfile(url: string): Promise<SoundCloudUser> {
  return getCacheService().getOrSet(
    `official:profile:${url}`,
    () => client.resolveProfile(url),
    { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE, staleTtl: STALE_RETENTION }
  );
}

export async function getUser(userId: number): Promise<SoundCloudUser> {
  return getCacheService().getOrSet(
    `official:user:${userId}`,
    () => client.getUser(userId),
    { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE, staleTtl: STALE_RETENTION }
  );
}

/**
 * Cache-only read: whatever profile is retained on disk (fresh or stale),
 * or null — never a network request. For render paths that must not block
 * on the API (cover mosaics).
 */
export function peekUser(userId: number): SoundCloudUser | null {
  return getCacheService().peekRetained<SoundCloudUser>(`official:user:${userId}`);
}

export async function getSpotlight(): Promise<{ collection: SpotlightItem[] }> {
  // No spotlight in the official API; nothing worth caching.
  return client.getSpotlight();
}

// ---------------------------------------------------------------------------
// Write-through seeding — the crawler fetches profiles and tracks anyway, so
// it stores them under the app's cache keys: every crawl warms the profile
// pages for the whole orbit.
// ---------------------------------------------------------------------------

export function seedUserCache(user: SoundCloudUser): void {
  const options = { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE, staleTtl: STALE_RETENTION };
  const service = getCacheService();
  service.set(`official:user:${user.id}`, user, options);
  if (user.permalink) {
    service.set(`official:profile:https://soundcloud.com/${user.permalink}`, user, options);
  }
}

export function seedTracksCache(userId: number, tracks: readonly SoundCloudTrack[]): void {
  const options = { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS, staleTtl: STALE_RETENTION };
  const service = getCacheService();
  // The profile page requests limit 50; seed both common shapes.
  service.set(`official:tracks:${userId}:200`, { collection: tracks }, options);
  service.set(`official:tracks:${userId}:50`, { collection: tracks.slice(0, 50) }, options);
}

export function seedRepostsCache(userId: number, reposts: readonly SoundCloudTrack[]): void {
  const options = { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS, staleTtl: STALE_RETENTION };
  const service = getCacheService();
  service.set(`official:reposts:${userId}:200`, { collection: reposts }, options);
  service.set(`official:reposts:${userId}:50`, { collection: reposts.slice(0, 50) }, options);
}

/**
 * Playlists and albums share one upstream request: the API has a single
 * /users/{urn}/playlists endpoint, so fetch + cache it once and filter.
 */
async function getAllUserPlaylistsCached(
  userId: number,
  limit: number
): Promise<{ collection: SoundCloudPlaylist[] }> {
  return getCacheService().getOrSet(
    `official:user-playlists:${userId}:${limit}`,
    () => client.getAllUserPlaylists(userId, limit),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS, staleTtl: STALE_RETENTION }
  );
}

export async function getPlaylists(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  const all = await getAllUserPlaylistsCached(userId, limit);
  return { collection: all.collection.filter((p) => !p.is_album) };
}

export async function getAlbums(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  const all = await getAllUserPlaylistsCached(userId, limit);
  return { collection: all.collection.filter((p) => p.is_album) };
}

export async function getTracks(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  return getCacheService().getOrSet(
    `official:tracks:${userId}:${limit}`,
    () => client.getTracks(userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS, staleTtl: STALE_RETENTION }
  );
}

export async function getReposts(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  return getCacheService().getOrSet(
    `official:reposts:${userId}:${limit}`,
    () => client.getReposts(userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS, staleTtl: STALE_RETENTION }
  );
}

export async function getTrack(trackId: number): Promise<SoundCloudTrack | null> {
  return getCacheService().getOrSet(
    `official:track:${trackId}`,
    () => client.getTrack(trackId),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS, staleTtl: STALE_RETENTION }
  );
}

export async function getTrackStreams(trackId: number): Promise<client.TrackStreams> {
  return getCacheService().getOrSet(
    `official:streams:${trackId}`,
    () => client.getTrackStreams(trackId),
    { ttl: CACHE_TTL.STREAMS, type: CACHE_TYPE.STREAMS }
  );
}

export async function getFollowers(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  const cacheKey = nextHref
    ? `official:followers:next:${nextHref}`
    : `official:followers:${userId}:${limit}`;
  return getCacheService().getOrSet(
    cacheKey,
    () => client.getFollowers(userId, limit, nextHref),
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS, staleTtl: STALE_RETENTION }
  );
}

export async function getFollowings(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  const cacheKey = nextHref
    ? `official:followings:next:${nextHref}`
    : `official:followings:${userId}:${limit}`;
  return getCacheService().getOrSet(
    cacheKey,
    () => client.getFollowings(userId, limit, nextHref),
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS, staleTtl: STALE_RETENTION }
  );
}

export async function getPlaylistWithTracks(
  playlistId: number
): Promise<SoundCloudPlaylist> {
  return getCacheService().getOrSet(
    `official:playlist:${playlistId}:tracks`,
    () => client.getPlaylistWithTracks(playlistId),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS, staleTtl: STALE_RETENTION }
  );
}

export async function search(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filter?: 'tracks' | 'users' | 'playlists' | 'albums';
  } = {}
): Promise<SoundCloudSearchResult> {
  const { limit = 20, offset = 0, filter } = options;
  return getCacheService().getOrSet(
    `official:search:${query}:${limit}:${offset}:${filter || 'all'}`,
    () => client.search(query, options),
    { ttl: CACHE_TTL.SEARCH, type: CACHE_TYPE.SEARCH }
  );
}
