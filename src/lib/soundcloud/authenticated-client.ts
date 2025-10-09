import got from "got";
import { 
  SoundCloudUser, 
  SoundCloudTrack, 
  SoundCloudPlaylist, 
  SoundCloudFollower,
  SpotlightItem,
  getTrack as getPublicTrack
} from "./client";

const SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com";

/**
 * Authenticated SoundCloud API client that uses OAuth access tokens
 */

export async function resolveProfile(accessToken: string, url: string): Promise<SoundCloudUser> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/resolve`, {
    searchParams: {
      url,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as SoundCloudUser;
}

export async function getSpotlight(accessToken: string, userId: number): Promise<{ collection: SpotlightItem[] }> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/spotlight`, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SpotlightItem[] };
}

export async function getPlaylists(accessToken: string, userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/playlists_without_albums`, {
    searchParams: {
      limit,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SoundCloudPlaylist[] };
}

export async function getAlbums(accessToken: string, userId: number, limit = 200): Promise<{ collection: SoundCloudPlaylist[] }> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/albums`, {
    searchParams: {
      limit,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SoundCloudPlaylist[] };
}

export async function getTracks(accessToken: string, userId: number, limit = 200): Promise<{ collection: SoundCloudTrack[] }> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/tracks`, {
    searchParams: {
      limit,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SoundCloudTrack[] };
}

export async function getFollowers(accessToken: string, userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  if (nextHref) {
    // Use the nextHref directly with OAuth token
    const text = await got(nextHref, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    }).text();
    return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
  }
  
  // Initial request
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/followers`, {
    searchParams: {
      limit,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
}

export async function getFollowings(accessToken: string, userId: number, limit = 200, nextHref?: string): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  if (nextHref) {
    // Use the nextHref directly with OAuth token
    const text = await got(nextHref, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    }).text();
    return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
  }
  
  // Initial request
  const text = await got(`${SOUNDCLOUD_API_BASE}/users/${userId}/followings`, {
    searchParams: {
      limit,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as { collection: SoundCloudFollower[]; next_href?: string };
}

export async function getPlaylistWithTracks(accessToken: string, playlistId: number): Promise<SoundCloudPlaylist> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/playlists/${playlistId}`, {
    searchParams: {
      linked_partitioning: 1, // Enable full track list
      client_id: process.env.SOUNDCLOUD_CLIENT_ID,
    },
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  const playlist = JSON.parse(text) as SoundCloudPlaylist;
  
  // Some tracks in the playlist might be incomplete (missing title, user, duration)
  // Fetch full details for each incomplete track (use public API - doesn't require auth)
  if (playlist.tracks && playlist.tracks.length > 0) {
    const trackPromises = playlist.tracks.map(async (track) => {
      // Check if track has all required fields
      const isComplete = track.title && track.user && track.duration !== undefined;
      
      if (!isComplete && track.id) {
        // Fetch full track details using public API
        try {
          const fullTrack = await getPublicTrack(track.id);
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
    playlist.tracks = fetchedTracks.filter((t): t is SoundCloudTrack => t !== null);
  }

  return playlist;
}

