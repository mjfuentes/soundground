/**
 * UNOFFICIAL api-v2 FALLBACK client (api-v2.soundcloud.com).
 *
 * This is NOT the primary data source — the official API client
 * (./official-client.ts) is. api-v2 is the undocumented endpoint the
 * SoundCloud web app uses; it is kept only as a clearly-labeled fallback
 * (it exposes a few things the official API lacks: spotlight, media
 * transcodings) and as reference for the pre-2026 data layer.
 *
 * It authenticates with a web client_id you must supply yourself via the
 * SOUNDCLOUD_APIV2_CLIENT_ID env var (opt-in). There is NO hardcoded
 * default: without that var every call here fails loudly.
 *
 * This module also owns the shared response type definitions
 * (SoundCloudUser, SoundCloudTrack, ...) that both providers map into.
 */

import got from "got";

const SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com";

/** Lazily resolve the opt-in api-v2 client_id; throw loudly when unset. */
function requireApiV2ClientId(): string {
  const clientId = process.env.SOUNDCLOUD_APIV2_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "SOUNDCLOUD_APIV2_CLIENT_ID is not configured. The unofficial api-v2 " +
        "fallback is opt-in; prefer the official API via SOUNDCLOUD_CLIENT_ID / " +
        "SOUNDCLOUD_CLIENT_SECRET. See .env.example."
    );
  }
  return clientId;
}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Raw GET against api-v2 with the fallback client_id attached.
 * Exposed for the stream route's transcoding fallback.
 *
 * Query params are appended via the URL object rather than got's
 * `searchParams` option — that option REPLACES the URL's existing query,
 * which would strip the cursor from next_href pagination URLs.
 */
export async function apiV2Get<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${SOUNDCLOUD_API_BASE}${endpoint}`
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("client_id", requireApiV2ClientId());
  const text = await got(url.toString(), {
    timeout: { request: REQUEST_TIMEOUT_MS },
    retry: { limit: 1 },
  }).text();
  return JSON.parse(text) as T;
}

export interface SoundCloudUser {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  permalink_url: string;
  description?: string;
  followers_count: number;
  followings_count: number;
  track_count: number;
  playlist_count: number;
  verified: boolean;
  city?: string;
  country_code?: string;
  full_name?: string;
  public_favorites_count?: number; // User's likes given
  reposts_count?: number; // User's reposts made
  comments_count?: number; // User's comments made
  visuals?: {
    urn: string;
    visual_url: string;
    entries?: Array<{ visual_url: string }>;
  } | null;
}

export interface SoundCloudComment {
  id: number;
  body: string;
  timestamp: number;
  user: {
    id: number;
    username: string;
    avatar_url?: string;
    permalink_url: string;
  };
}

export interface SoundCloudTrack {
  id: number;
  title: string;
  permalink_url: string;
  artwork_url?: string;
  duration: number;
  playback_count?: number;
  likes_count?: number;
  reposts_count?: number;
  comment_count?: number;
  description?: string;
  genre?: string;
  tag_list?: string; // Space-separated tags
  created_at?: string;
  streamable?: boolean; // Whether track has streaming enabled
  access?: "playable" | "preview" | "blocked"; // Track access level
  policy?: string; // Monetization/licensing policy
  purchase_url?: string; // External purchase/download link
  download_url?: string; // Direct download link
  comments?: SoundCloudComment[]; // Recent comments
  user: {
    id: number;
    username: string;
    permalink_url: string;
    avatar_url?: string;
  };
}

// Re-export track validation function
export { isTrackPlayable } from './track-validation';

export interface SoundCloudPlaylist {
  id: number;
  title: string;
  permalink_url: string;
  artwork_url?: string;
  description?: string;
  duration: number;
  track_count: number;
  likes_count?: number;
  reposts_count?: number;
  playback_count?: number;
  is_album: boolean;
  set_type?: string; // Type of playlist/album (playlist, album, ep, compilation)
  created_at?: string;
  tracks?: SoundCloudTrack[];
  purchase_url?: string; // External purchase/download link
  download_url?: string; // Direct download link
  user: {
    id: number;
    username: string;
    permalink_url: string;
    avatar_url?: string;
  };
}

export async function resolveProfile(url: string): Promise<SoundCloudUser> {
  return apiV2Get<SoundCloudUser>("/resolve", { url });
}

export type SpotlightItem = SoundCloudTrack | SoundCloudPlaylist;

export async function getSpotlight(userId: number): Promise<{ collection: SpotlightItem[] }> {
  return apiV2Get<{ collection: SpotlightItem[] }>(`/users/${userId}/spotlight`);
}

// Type guard to check if an item is a playlist
export function isPlaylist(item: SpotlightItem): item is SoundCloudPlaylist {
  return 'track_count' in item && 'is_album' in item;
}

export async function getPlaylists(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  return apiV2Get<{ collection: SoundCloudPlaylist[] }>(
    `/users/${userId}/playlists_without_albums`,
    { limit }
  );
}

export async function getAlbums(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  return apiV2Get<{ collection: SoundCloudPlaylist[] }>(`/users/${userId}/albums`, { limit });
}

export async function getTracks(userId: number, limit = 200): Promise<{ collection: SoundCloudTrack[] }> {
  return apiV2Get<{ collection: SoundCloudTrack[] }>(`/users/${userId}/tracks`, { limit });
}

export async function getReposts(userId: number, limit = 200): Promise<{ collection: SoundCloudTrack[] }> {
  return apiV2Get<{ collection: SoundCloudTrack[] }>(`/users/${userId}/track_reposts`, { limit });
}

export async function getTrack(trackId: number): Promise<SoundCloudTrack | null> {
  try {
    return await apiV2Get<SoundCloudTrack>(`/tracks/${trackId}`);
  } catch (error) {
    console.error(`Error fetching track ${trackId}:`, error);
    return null;
  }
}

export interface SoundCloudFollower {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  track_count?: number;
  city?: string | null;
  country_code?: string | null;
}

export async function getFollowers(userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  if (nextHref) {
    return apiV2Get<{ collection: SoundCloudFollower[]; next_href?: string }>(nextHref);
  }
  return apiV2Get<{ collection: SoundCloudFollower[]; next_href?: string }>(
    `/users/${userId}/followers`,
    { limit }
  );
}

export async function getFollowings(userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  if (nextHref) {
    return apiV2Get<{ collection: SoundCloudFollower[]; next_href?: string }>(nextHref);
  }
  return apiV2Get<{ collection: SoundCloudFollower[]; next_href?: string }>(
    `/users/${userId}/followings`,
    { limit }
  );
}

export async function getPlaylistWithTracks(playlistId: number): Promise<SoundCloudPlaylist> {
  const playlist = await apiV2Get<SoundCloudPlaylist>(`/playlists/${playlistId}`, {
    linked_partitioning: 1, // Enable full track list
  });

  // Some tracks in the playlist might be incomplete (missing title, user, duration)
  // Fetch full details for each incomplete track
  if (playlist.tracks && playlist.tracks.length > 0) {
    const trackPromises = playlist.tracks.map(async (track) => {
      // Check if track has all required fields
      const isComplete = track.title && track.user && track.duration !== undefined;

      if (!isComplete && track.id) {
        // Fetch full track details
        try {
          const fullTrack = await getTrack(track.id);
          return fullTrack || track; // Fall back to incomplete track if fetch returns null
        } catch (error) {
          // If track fetch fails, return the incomplete track
          console.warn(`Failed to fetch track ${track.id}:`, error);
          return track;
        }
      }

      return track;
    });

    // Wait for all track fetches to complete
    const fetchedTracks = await Promise.all(trackPromises);
    // Filter out any null tracks that couldn't be fetched
    return {
      ...playlist,
      tracks: fetchedTracks.filter((t): t is SoundCloudTrack => t !== null),
    };
  }

  return playlist;
}

export interface SoundCloudSearchResult {
  collection: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  total_results?: number;
  next_href?: string;
  query_urn?: string;
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
  return apiV2Get<SoundCloudSearchResult>("/search", {
    q: query,
    limit,
    offset,
    ...(filter && { filter }),
  });
}
