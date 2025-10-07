/**
 * Smart client that automatically chooses between authenticated and public API
 * based on whether OAuth credentials are available
 */

import * as authCachedClient from "./authenticated-cached-client";
import * as publicCachedClient from "./cached-client";
import { getSession } from "@/lib/auth/session";

const hasOAuthSecret = () => {
  return process.env.SOUNDCLOUD_CLIENT_SECRET && 
    process.env.SOUNDCLOUD_CLIENT_SECRET !== "your_client_secret_here";
};

export async function resolveProfile(url: string) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.resolveProfile(url);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.resolveProfile(session.accessToken, url);
}

export async function getSpotlight(userId: number) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getSpotlight(userId);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getSpotlight(session.accessToken, userId);
}

export async function getPlaylists(userId: number, limit = 200) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getPlaylists(userId, limit);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getPlaylists(session.accessToken, userId, limit);
}

export async function getAlbums(userId: number, limit = 200) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getAlbums(userId, limit);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getAlbums(session.accessToken, userId, limit);
}

export async function getTracks(userId: number, limit = 200) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getTracks(userId, limit);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getTracks(session.accessToken, userId, limit);
}

export async function getFollowers(userId: number, limit = 200, nextHref?: string) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getFollowers(userId, limit, nextHref);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getFollowers(session.accessToken, userId, limit, nextHref);
}

export async function getPlaylistWithTracks(playlistId: number) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getPlaylistWithTracks(playlistId);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getPlaylistWithTracks(session.accessToken, playlistId);
}

// Re-export types
export type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SpotlightItem,
} from "./client";

export { isPlaylist } from "./client";

