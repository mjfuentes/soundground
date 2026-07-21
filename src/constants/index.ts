/**
 * Application-wide constants
 * 
 * Centralized location for all magic numbers, strings, and configuration values
 * used throughout the application.
 */

// ============================================================================
// SoundCloud API Configuration
// ============================================================================

// Note: API base URLs and credential handling live in lib/soundcloud/config.ts.
// Credentials come exclusively from the environment — never hardcode them here.

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_TTL = {
  PROFILE: 30 * 60 * 1000, // 30 minutes
  TRACKS: 15 * 60 * 1000, // 15 minutes
  PLAYLISTS: 90 * 24 * 60 * 60 * 1000, // 90 days (essentially permanent - full track data fetched on first load)
  SEARCH: 10 * 60 * 1000, // 10 minutes
  FOLLOWERS: 60 * 60 * 1000, // 1 hour
  DEFAULT: 5 * 60 * 1000, // 5 minutes
} as const;

export const CACHE_TYPES = {
  PROFILE: "profile",
  TRACKS: "tracks",
  PLAYLISTS: "playlists",
  SEARCH: "search",
  FOLLOWERS: "followers",
  GENERAL: "general",
} as const;

// ============================================================================
// Player Configuration
// ============================================================================

export const PLAYER_CONFIG = {
  DEFAULT_VOLUME: 0.8,
  AUTO_SKIP_DELAY: 2000, // 2 seconds delay before auto-skip on error
  SEEK_STEP: 10, // seconds
} as const;

// ============================================================================
// Pagination & Limits
// ============================================================================

export const API_LIMITS = {
  TRACKS: 50,
  REPOSTS: 50,
  PLAYLISTS: 200,
  ALBUMS: 200,
  FOLLOWERS: 200,
  SEARCH_RESULTS: 20,
} as const;

// ============================================================================
// Image Quality
// ============================================================================

export const IMAGE_SIZES = {
  LARGE: "t500x500.jpg",
  ORIGINAL: "original.jpg",
  T300: "t300x300.jpg",
  T67: "t67x67.jpg",
} as const;

// ============================================================================
// Session Configuration
// ============================================================================

export const SESSION_CONFIG = {
  COOKIE_NAME: "session",
  MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  JWT_EXPIRY: "7d",
} as const;

// ============================================================================
// Routes
// ============================================================================

export const ROUTES = {
  HOME: "/",
  PROFILE: (handle: string) => `/${handle}`,
  TRACK: (trackId: number) => `/track/${trackId}`,
  PLAY: "/play",
} as const;

export const API_ROUTES = {
  SOUNDCLOUD: {
    PROFILE: "/api/soundcloud/profile",
    TRACKS: "/api/soundcloud/tracks",
    PLAYLISTS: "/api/soundcloud/playlists",
    ALBUMS: "/api/soundcloud/albums",
    FOLLOWERS: "/api/soundcloud/followers",
    SEARCH: "/api/search",
    RESOLVE: "/api/soundcloud/resolve",
    STREAM: (trackId: number) => `/api/soundcloud/stream/${trackId}`,
    TRACK: (trackId: number) => `/api/soundcloud/track/${trackId}`,
  },
  CACHE: "/api/cache",
} as const;

// ============================================================================
// External Platform URLs
// ============================================================================

export const EXTERNAL_PLATFORMS = {
  BANDCAMP: "bandcamp.com",
  HYPEDDIT: "hypeddit.com",
  BEATPORT: "beatport.com",
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  AUTH: {
    UNAUTHORIZED: "Unauthorized",
    INVALID_SESSION: "Invalid session",
    MISSING_CREDENTIALS: "Missing authentication credentials",
  },
  API: {
    GENERIC: "An error occurred while processing your request",
    SOUNDCLOUD: "Failed to fetch SoundCloud data",
    NETWORK: "Network error. Please check your connection.",
  },
  PLAYER: {
    LOAD_FAILED: "Failed to load track",
    STREAM_ERROR: "HLS stream error. Try opening in SoundCloud.",
    TRACK_UNAVAILABLE: "This track is unavailable. It may have been deleted or is not available in your region. Try opening in SoundCloud.",
    NO_STREAM_URL: "No stream URL available. Try opening in SoundCloud.",
  },
  CACHE: {
    INIT_FAILED: "Failed to initialize cache",
    OPERATION_FAILED: "Cache operation failed",
  },
} as const;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Timeouts
// ============================================================================

export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  STREAM_FETCH: 60000, // 60 seconds
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  ENABLE_SEARCH: true,
  ENABLE_QUEUE: true,
  ENABLE_SHUFFLE: true,
  ENABLE_COMMENTS: false, // Not available in public API
} as const;

