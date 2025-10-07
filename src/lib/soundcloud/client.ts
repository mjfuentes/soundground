import got from "got";

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID";
const SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com";

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
  created_at?: string;
  user: {
    id: number;
    username: string;
    permalink_url: string;
  };
}

export async function resolveProfile(url: string): Promise<SoundCloudUser> {
  const response = await got(`${SOUNDCLOUD_API_BASE}/resolve`, {
    searchParams: {
      url,
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<SoundCloudUser>();

  return response;
}

export type SpotlightItem = SoundCloudTrack | SoundCloudPlaylist;

export async function getSpotlight(userId: number): Promise<{ collection: SpotlightItem[] }> {
  const response = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/spotlight`, {
    searchParams: {
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<{ collection: SpotlightItem[] }>();

  return response;
}

// Type guard to check if an item is a playlist
export function isPlaylist(item: SpotlightItem): item is SoundCloudPlaylist {
  return 'track_count' in item && 'is_album' in item;
}

export async function getPlaylists(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const response = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/playlists_without_albums`, {
    searchParams: {
      limit,
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<{ collection: SoundCloudPlaylist[] }>();

  return response;
}

export async function getAlbums(userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const response = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/albums`, {
    searchParams: {
      limit,
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<{ collection: SoundCloudPlaylist[] }>();

  return response;
}

export async function getTracks(userId: number, limit = 200): Promise<{ collection: SoundCloudTrack[] }> {
  const response = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/tracks`, {
    searchParams: {
      limit,
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<{ collection: SoundCloudTrack[] }>();

  return response;
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
  if (nextHref) {
    // Use the nextHref directly with client_id appended
    const url = `${nextHref}&client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const response = await got(url).json<{ collection: SoundCloudFollower[]; next_href?: string }>();
    return response;
  }
  
  // Initial request
  const response = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/followers`, {
    searchParams: {
      limit,
      client_id: SOUNDCLOUD_CLIENT_ID,
    },
  }).json<{ collection: SoundCloudFollower[]; next_href?: string }>();

  return response;
}

