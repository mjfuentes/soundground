import { getCacheService } from '@/lib/cache';
import * as authClient from './authenticated-client';

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  PROFILE: 10 * 60 * 1000, // 10 minutes
  SPOTLIGHT: 15 * 60 * 1000, // 15 minutes
  PLAYLISTS: 20 * 60 * 1000, // 20 minutes
  ALBUMS: 20 * 60 * 1000, // 20 minutes
  TRACKS: 20 * 60 * 1000, // 20 minutes
  FOLLOWERS: 30 * 60 * 1000, // 30 minutes
};

// Cache types for categorization
const CACHE_TYPE = {
  PROFILE: 'soundcloud:profile',
  SPOTLIGHT: 'soundcloud:spotlight',
  PLAYLISTS: 'soundcloud:playlists',
  ALBUMS: 'soundcloud:albums',
  TRACKS: 'soundcloud:tracks',
  FOLLOWERS: 'soundcloud:followers',
};

/**
 * Cached version of resolveProfile with OAuth token
 */
export async function resolveProfile(accessToken: string, url: string) {
  const cache = getCacheService();
  const cacheKey = `profile:${url}`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.resolveProfile(accessToken, url),
    { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE }
  );
}

/**
 * Cached version of getSpotlight with OAuth token
 */
export async function getSpotlight(accessToken: string, userId: number) {
  const cache = getCacheService();
  const cacheKey = `spotlight:${userId}`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.getSpotlight(accessToken, userId),
    { ttl: CACHE_TTL.SPOTLIGHT, type: CACHE_TYPE.SPOTLIGHT }
  );
}

/**
 * Cached version of getPlaylists with OAuth token
 */
export async function getPlaylists(accessToken: string, userId: number, limit = 200) {
  const cache = getCacheService();
  const cacheKey = `playlists:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.getPlaylists(accessToken, userId, limit),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

/**
 * Cached version of getAlbums with OAuth token
 */
export async function getAlbums(accessToken: string, userId: number, limit = 200) {
  const cache = getCacheService();
  const cacheKey = `albums:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.getAlbums(accessToken, userId, limit),
    { ttl: CACHE_TTL.ALBUMS, type: CACHE_TYPE.ALBUMS }
  );
}

/**
 * Cached version of getTracks with OAuth token
 */
export async function getTracks(accessToken: string, userId: number, limit = 200) {
  const cache = getCacheService();
  const cacheKey = `tracks:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.getTracks(accessToken, userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
  );
}

/**
 * Cached version of getFollowers with OAuth token
 * Note: Followers with pagination are cached per page/nextHref
 */
export async function getFollowers(
  accessToken: string,
  userId: number,
  limit = 200,
  nextHref?: string
) {
  const cache = getCacheService();
  const cacheKey = nextHref
    ? `followers:next:${nextHref}`
    : `followers:${userId}:${limit}`;
  
  return cache.getOrSet(
    cacheKey,
    () => authClient.getFollowers(accessToken, userId, limit, nextHref),
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS }
  );
}

/**
 * Cached version of getPlaylistWithTracks with OAuth token
 */
export async function getPlaylistWithTracks(accessToken: string, playlistId: number) {
  const cache = getCacheService();
  const cacheKey = `playlist:${playlistId}:tracks`;
  return cache.getOrSet(
    cacheKey,
    () => authClient.getPlaylistWithTracks(accessToken, playlistId),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

/**
 * Invalidate all cache for a specific user
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invalidateUserCache(userId: number): void {
  const cache = getCacheService();
  cache.deleteByType(CACHE_TYPE.PROFILE);
  cache.deleteByType(CACHE_TYPE.SPOTLIGHT);
  cache.deleteByType(CACHE_TYPE.PLAYLISTS);
  cache.deleteByType(CACHE_TYPE.ALBUMS);
  cache.deleteByType(CACHE_TYPE.TRACKS);
  cache.deleteByType(CACHE_TYPE.FOLLOWERS);
}

/**
 * Get cache statistics for SoundCloud data
 */
export function getCacheStats() {
  const cache = getCacheService();
  return {
    profile: cache.getStatsByType(CACHE_TYPE.PROFILE),
    spotlight: cache.getStatsByType(CACHE_TYPE.SPOTLIGHT),
    playlists: cache.getStatsByType(CACHE_TYPE.PLAYLISTS),
    albums: cache.getStatsByType(CACHE_TYPE.ALBUMS),
    tracks: cache.getStatsByType(CACHE_TYPE.TRACKS),
    followers: cache.getStatsByType(CACHE_TYPE.FOLLOWERS),
  };
}

