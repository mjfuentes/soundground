import { getCacheService } from '@/lib/cache';
import * as client from './client';

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  PROFILE: 10 * 60 * 1000, // 10 minutes
  SPOTLIGHT: 15 * 60 * 1000, // 15 minutes
  PLAYLISTS: 20 * 60 * 1000, // 20 minutes
  ALBUMS: 20 * 60 * 1000, // 20 minutes
  TRACKS: 20 * 60 * 1000, // 20 minutes
  FOLLOWERS: 30 * 60 * 1000, // 30 minutes
  SEARCH: 5 * 60 * 1000, // 5 minutes (search results change frequently)
};

// Cache types for categorization
const CACHE_TYPE = {
  PROFILE: 'soundcloud:profile',
  SPOTLIGHT: 'soundcloud:spotlight',
  PLAYLISTS: 'soundcloud:playlists',
  ALBUMS: 'soundcloud:albums',
  TRACKS: 'soundcloud:tracks',
  FOLLOWERS: 'soundcloud:followers',
  SEARCH: 'soundcloud:search',
};

/**
 * Cached version of resolveProfile
 */
export async function resolveProfile(url: string): Promise<client.SoundCloudUser> {
  const cache = getCacheService();
  const cacheKey = `profile:${url}`;
  return cache.getOrSet(
    cacheKey,
    () => client.resolveProfile(url),
    { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE }
  );
}

/**
 * Cached version of getSpotlight
 */
export async function getSpotlight(userId: number): Promise<{ collection: client.SpotlightItem[] }> {
  const cache = getCacheService();
  const cacheKey = `spotlight:${userId}`;
  return cache.getOrSet(
    cacheKey,
    () => client.getSpotlight(userId),
    { ttl: CACHE_TTL.SPOTLIGHT, type: CACHE_TYPE.SPOTLIGHT }
  );
}

/**
 * Cached version of getPlaylists
 */
export async function getPlaylists(userId: number, limit = 200): Promise<{ collection: client.SoundCloudPlaylist[] }> {
  const cache = getCacheService();
  const cacheKey = `playlists:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => client.getPlaylists(userId, limit),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

/**
 * Cached version of getAlbums
 */
export async function getAlbums(userId: number, limit = 200): Promise<{ collection: client.SoundCloudPlaylist[] }> {
  const cache = getCacheService();
  const cacheKey = `albums:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => client.getAlbums(userId, limit),
    { ttl: CACHE_TTL.ALBUMS, type: CACHE_TYPE.ALBUMS }
  );
}

/**
 * Cached version of getTracks
 */
export async function getTracks(userId: number, limit = 200): Promise<{ collection: client.SoundCloudTrack[] }> {
  const cache = getCacheService();
  const cacheKey = `tracks:${userId}:${limit}`;
  return cache.getOrSet(
    cacheKey,
    () => client.getTracks(userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
  );
}

/**
 * Cached version of getTrack
 */
export async function getTrack(trackId: number): Promise<client.SoundCloudTrack | null> {
  const cache = getCacheService();
  const cacheKey = `track:${trackId}`;
  return cache.getOrSet(
    cacheKey,
    () => client.getTrack(trackId),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
  );
}

/**
 * Cached version of getFollowers
 * Note: Followers with pagination are cached per page/nextHref
 */
export async function getFollowers(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: client.SoundCloudFollower[]; next_href?: string }> {
  const cache = getCacheService();
  const cacheKey = nextHref
    ? `followers:next:${nextHref}`
    : `followers:${userId}:${limit}`;
  
  return cache.getOrSet(
    cacheKey,
    () => client.getFollowers(userId, limit, nextHref),
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS }
  );
}

/**
 * Cached version of getFollowings
 * Note: Followings with pagination are cached per page/nextHref
 */
export async function getFollowings(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: client.SoundCloudFollower[]; next_href?: string }> {
  const cache = getCacheService();
  const cacheKey = nextHref
    ? `followings:next:${nextHref}`
    : `followings:${userId}:${limit}`;
  
  return cache.getOrSet(
    cacheKey,
    () => client.getFollowings(userId, limit, nextHref),
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS }
  );
}

/**
 * Cached version of getPlaylistWithTracks
 */
export async function getPlaylistWithTracks(playlistId: number): Promise<client.SoundCloudPlaylist> {
  const cache = getCacheService();
  const cacheKey = `playlist:${playlistId}:tracks`;
  return cache.getOrSet(
    cacheKey,
    () => client.getPlaylistWithTracks(playlistId),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

/**
 * Cached version of search
 */
export async function search(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filter?: 'tracks' | 'users' | 'playlists' | 'albums';
  } = {}
): Promise<client.SoundCloudSearchResult> {
  const cache = getCacheService();
  const { limit = 20, offset = 0, filter } = options;
  const cacheKey = `search:${query}:${limit}:${offset}:${filter || 'all'}`;
  
  return cache.getOrSet(
    cacheKey,
    () => client.search(query, options),
    { ttl: CACHE_TTL.SEARCH, type: CACHE_TYPE.SEARCH }
  );
}

/**
 * Invalidate all cache for a specific user
 * Note: Currently clears all cache entries of SoundCloud types
 * In a production system, you would implement pattern-based deletion for the specific userId
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invalidateUserCache(userId: number): void {
  const cache = getCacheService();
  // For simplicity, we clear all entries of each type
  // In a production system, you would filter by userId
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

// Re-export types and functions from the original client
export type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SpotlightItem,
  SoundCloudSearchResult,
} from './client';

export { isPlaylist } from './client';

