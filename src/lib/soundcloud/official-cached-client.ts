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

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  PROFILE: 10 * 60 * 1000, // 10 minutes
  PLAYLISTS: 20 * 60 * 1000, // 20 minutes
  TRACKS: 20 * 60 * 1000, // 20 minutes
  FOLLOWERS: 30 * 60 * 1000, // 30 minutes
  SEARCH: 5 * 60 * 1000, // 5 minutes
  STREAMS: 30 * 60 * 1000, // 30 minutes (stream URLs are short-lived tokens)
};

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
    { ttl: CACHE_TTL.PROFILE, type: CACHE_TYPE.PROFILE }
  );
}

export async function getSpotlight(): Promise<{ collection: SpotlightItem[] }> {
  // No spotlight in the official API; nothing worth caching.
  return client.getSpotlight();
}

export async function getPlaylists(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  return getCacheService().getOrSet(
    `official:playlists:${userId}:${limit}`,
    () => client.getPlaylists(userId, limit),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

export async function getAlbums(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  return getCacheService().getOrSet(
    `official:albums:${userId}:${limit}`,
    () => client.getAlbums(userId, limit),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
  );
}

export async function getTracks(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  return getCacheService().getOrSet(
    `official:tracks:${userId}:${limit}`,
    () => client.getTracks(userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
  );
}

export async function getReposts(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  return getCacheService().getOrSet(
    `official:reposts:${userId}:${limit}`,
    () => client.getReposts(userId, limit),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
  );
}

export async function getTrack(trackId: number): Promise<SoundCloudTrack | null> {
  return getCacheService().getOrSet(
    `official:track:${trackId}`,
    () => client.getTrack(trackId),
    { ttl: CACHE_TTL.TRACKS, type: CACHE_TYPE.TRACKS }
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
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS }
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
    { ttl: CACHE_TTL.FOLLOWERS, type: CACHE_TYPE.FOLLOWERS }
  );
}

export async function getPlaylistWithTracks(
  playlistId: number
): Promise<SoundCloudPlaylist> {
  return getCacheService().getOrSet(
    `official:playlist:${playlistId}:tracks`,
    () => client.getPlaylistWithTracks(playlistId),
    { ttl: CACHE_TTL.PLAYLISTS, type: CACHE_TYPE.PLAYLISTS }
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
