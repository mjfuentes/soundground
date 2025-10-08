/**
 * Smart client that automatically chooses between authenticated and public API
 * based on whether OAuth credentials are available
 */

import * as authCachedClient from "./authenticated-cached-client";
import * as publicCachedClient from "./cached-client";
import { getSession } from "@/lib/auth/session";
import { NextRequest } from "next/server";
import got from "got";
import { getClientCredentialsToken, hasClientCredentials } from "./client-credentials";

const SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com";
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID";

const hasOAuthSecret = () => {
  return process.env.SOUNDCLOUD_CLIENT_SECRET && 
    process.env.SOUNDCLOUD_CLIENT_SECRET !== "your_client_secret_here";
};

/**
 * Get authorization headers - prefers user OAuth token, then client credentials, then client_id
 */
async function getAuthHeaders(accessToken?: string): Promise<Record<string, string>> {
  // If we have a user access token, use it
  if (accessToken) {
    return { Authorization: `OAuth ${accessToken}` };
  }
  
  // Try to use Client Credentials token if available
  if (hasClientCredentials()) {
    try {
      const token = await getClientCredentialsToken();
      return { Authorization: `OAuth ${token}` };
    } catch (error) {
      console.warn("Failed to get client credentials token, falling back to client_id:", error);
    }
  }
  
  // Fallback to no auth header (will use client_id in query params)
  return {};
}

/**
 * Get a smart client instance that works with the request context
 * Returns an object with a get method for making authenticated or public requests
 */
export async function getSmartClient(request?: NextRequest) {
  const session = request ? await getSession() : null;
  const accessToken = session?.accessToken;
  
  return {
    async get(endpoint: string) {
      const url = endpoint.startsWith("http") 
        ? endpoint 
        : `${SOUNDCLOUD_API_BASE}${endpoint}`;
      
      const headers = await getAuthHeaders(accessToken);
      
      // Add client_id to query params if we're not using OAuth
      const needsClientId = !headers.Authorization && !hasClientCredentials();
      
      try {
        const response = await got(url, {
          headers,
          searchParams: needsClientId ? { client_id: SOUNDCLOUD_CLIENT_ID } : {},
        });
        
        return JSON.parse(response.body);
      } catch (error) {
        // Re-throw with better error info
        if (error && typeof error === 'object' && 'response' in error) {
          const gotError = error as { response: { statusCode: number; body: string } };
          throw Object.assign(
            new Error(`SoundCloud API error: ${gotError.response.body || 'Unknown error'}`),
            { response: { statusCode: gotError.response.statusCode } }
          );
        }
        throw error;
      }
    },
  };
}

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

export async function getFollowings(userId: number, limit = 200, nextHref?: string) {
  if (!hasOAuthSecret()) {
    return publicCachedClient.getFollowings(userId, limit, nextHref);
  }
  
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return authCachedClient.getFollowings(session.accessToken, userId, limit, nextHref);
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

export async function search(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filter?: 'tracks' | 'users' | 'playlists' | 'albums';
  } = {}
) {
  // Search doesn't require authentication, use public client
  return publicCachedClient.search(query, options);
}

// Re-export types
export type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SpotlightItem,
  SoundCloudSearchResult,
} from "./client";

export { isPlaylist } from "./client";

