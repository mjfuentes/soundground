import got from "got";
import { getClientCredentialsToken, hasClientCredentials } from "./client-credentials";

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID";
const SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com";

/**
 * Get authorization headers - prefers OAuth token over client_id
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Try to use Client Credentials token if available
  if (hasClientCredentials()) {
    try {
      const token = await getClientCredentialsToken();
      return { Authorization: `OAuth ${token}` };
    } catch (error) {
      console.warn("Failed to get client credentials token, falling back to client_id:", error);
    }
  }
  
  // Fallback to client_id in query params (deprecated but works)
  return {};
}

/**
 * Get search params with auth - either empty (for OAuth header) or client_id
 */
function getAuthParams(params: Record<string, string | number> = {}): Record<string, string | number> {
  if (!hasClientCredentials()) {
    return { ...params, client_id: SOUNDCLOUD_CLIENT_ID };
  }
  return params;
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
  };
}

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
  };
}

export async function resolveProfile(url: string): Promise<SoundCloudUser> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams({ url });
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/resolve`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as SoundCloudUser;
}

export type SpotlightItem = SoundCloudTrack | SoundCloudPlaylist;

export async function getSpotlight(userId: number): Promise<{ collection: SpotlightItem[] }> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams();
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/spotlight`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SpotlightItem[] };
}

// Type guard to check if an item is a playlist
export function isPlaylist(item: SpotlightItem): item is SoundCloudPlaylist {
  return 'track_count' in item && 'is_album' in item;
}

export async function getPlaylists(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams({ limit });
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/playlists_without_albums`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SoundCloudPlaylist[] };
}

export async function getAlbums(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams({ limit });
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/albums`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SoundCloudPlaylist[] };
}

export async function getTracks(userId: number, limit = 200): Promise<{ collection: SoundCloudTrack[] }> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams({ limit });
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/tracks`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SoundCloudTrack[] };
}

export interface SoundCloudFollower {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  track_count?: number;
}

export async function getFollowers(userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  const headers = await getAuthHeaders();
  
  if (nextHref) {
    // Use the nextHref directly
    const url = hasClientCredentials() ? nextHref : `${nextHref}&client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const text = await got(url, { headers }).text();
    return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
  }
  
  // Initial request
  const searchParams = getAuthParams({ limit });
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/followers`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
}

export async function getFollowings(userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  const headers = await getAuthHeaders();
  
  if (nextHref) {
    // Use the nextHref directly
    const url = hasClientCredentials() ? nextHref : `${nextHref}&client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const text = await got(url, { headers }).text();
    return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
  }
  
  // Initial request
  const searchParams = getAuthParams({ limit });
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/followings`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
}

export async function getPlaylistWithTracks(playlistId: number): Promise<SoundCloudPlaylist> {
  const headers = await getAuthHeaders();
  const searchParams = getAuthParams();
  
  const text = await got(`${SOUNDCLOUD_API_BASE}/playlists/${playlistId}`, {
    searchParams,
    headers,
  }).text();

  return JSON.parse(text) as SoundCloudPlaylist;
}

