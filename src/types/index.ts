/**
 * Centralized type definitions for SoundGround
 * 
 * This file contains shared type definitions used across the application.
 * Import from this file instead of defining types in multiple places.
 */

// ============================================================================
// SoundCloud API Types
// ============================================================================

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
  public_favorites_count?: number;
  reposts_count?: number;
  comments_count?: number;
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
  streamable?: boolean;
  access?: "playable" | "preview" | "blocked";
  policy?: string;
  purchase_url?: string;
  download_url?: string;
  comments?: SoundCloudComment[];
  user: {
    id: number;
    username: string;
    permalink_url: string;
    avatar_url?: string;
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
  set_type?: string;
  created_at?: string;
  tracks?: SoundCloudTrack[];
  purchase_url?: string;
  download_url?: string;
  user: {
    id: number;
    username: string;
    permalink_url: string;
    avatar_url?: string;
  };
}

export interface SoundCloudFollower {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  track_count?: number;
}

export interface SoundCloudSearchResult {
  collection: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  total_results?: number;
  next_href?: string;
  query_urn?: string;
}

export type SpotlightItem = SoundCloudTrack | SoundCloudPlaylist;

// ============================================================================
// Player Types
// ============================================================================

export interface PlayableItem {
  id: number;
  url: string;
  title: string;
  artist: string;
  artistUrl: string;
  artwork?: string;
  description?: string;
  type: "track" | "playlist" | "album";
}

export interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  queue: PlayableItem[];
  hasPlayedBefore: boolean;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: number;
  username: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheOptions {
  ttl?: number;
  type?: string;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  type: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface CacheStats {
  type: string;
  hit_count: number;
  miss_count: number;
  last_accessed: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProfileApiResponse {
  profile: SoundCloudUser;
  spotlight: SpotlightItem[];
  playlists: SoundCloudPlaylist[];
  albums: SoundCloudPlaylist[];
  tracks: SoundCloudTrack[];
  reposts: SoundCloudTrack[];
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface TrackCardProps {
  track: SoundCloudTrack;
  showStats?: boolean;
  playlistTracks?: SoundCloudTrack[];
  coverOnly?: boolean;
}

export interface PlaylistCardProps {
  playlist: SoundCloudPlaylist;
  showStats?: boolean;
}

export interface AlbumCardProps {
  album: SoundCloudPlaylist;
  showStats?: boolean;
}

export interface FollowerCardProps {
  follower: SoundCloudFollower;
}

