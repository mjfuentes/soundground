import got from "got";
import { 
  SoundCloudUser, 
  SoundCloudTrack, 
  SoundCloudPlaylist, 
  SoundCloudFollower,
  SpotlightItem 
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

export async function getPlaylistWithTracks(accessToken: string, playlistId: number): Promise<SoundCloudPlaylist> {
  const text = await got(`${SOUNDCLOUD_API_BASE}/playlists/${playlistId}`, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  }).text();

  return JSON.parse(text) as SoundCloudPlaylist;
}

