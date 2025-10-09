/**
 * Test utilities and helpers for SoundGround tests
 * 
 * Provides common test utilities, fixtures, and helpers to reduce boilerplate
 * and ensure consistent testing patterns across the codebase.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { PlayerProvider } from '@/contexts/player-context';
import type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SoundCloudComment,
} from '@/types';

// ============================================================================
// Mock Data Factories
// ============================================================================

export const createMockUser = (overrides?: Partial<SoundCloudUser>): SoundCloudUser => ({
  id: 123456,
  permalink: 'testuser',
  username: 'Test User',
  avatar_url: 'https://i1.sndcdn.com/avatars-000000000000-abcdef-large.jpg',
  permalink_url: 'https://soundcloud.com/testuser',
  description: 'Test user description',
  followers_count: 1000,
  followings_count: 500,
  track_count: 50,
  playlist_count: 10,
  verified: false,
  city: 'Test City',
  country_code: 'US',
  full_name: 'Test User',
  public_favorites_count: 100,
  reposts_count: 25,
  comments_count: 15,
  visuals: null,
  ...overrides,
});

export const createMockTrack = (overrides?: Partial<SoundCloudTrack>): SoundCloudTrack => ({
  id: 789012,
  title: 'Test Track',
  permalink_url: 'https://soundcloud.com/testuser/test-track',
  artwork_url: 'https://i1.sndcdn.com/artworks-000000000000-abcdef-large.jpg',
  duration: 180000, // 3 minutes
  playback_count: 5000,
  likes_count: 250,
  reposts_count: 50,
  comment_count: 10,
  description: 'Test track description',
  genre: 'Electronic',
  created_at: '2024-01-01T00:00:00Z',
  streamable: true,
  access: 'playable',
  policy: 'ALLOW',
  purchase_url: 'https://bandcamp.com/test',
  user: {
    id: 123456,
    username: 'testuser',
    permalink_url: 'https://soundcloud.com/testuser',
    avatar_url: 'https://i1.sndcdn.com/avatars-000000000000-abcdef-large.jpg',
  },
  ...overrides,
});

export const createMockPlaylist = (overrides?: Partial<SoundCloudPlaylist>): SoundCloudPlaylist => ({
  id: 345678,
  title: 'Test Playlist',
  permalink_url: 'https://soundcloud.com/testuser/sets/test-playlist',
  artwork_url: 'https://i1.sndcdn.com/artworks-000000000000-abcdef-large.jpg',
  description: 'Test playlist description',
  duration: 600000, // 10 minutes
  track_count: 5,
  likes_count: 100,
  reposts_count: 20,
  playback_count: 2000,
  is_album: false,
  set_type: 'playlist',
  created_at: '2024-01-01T00:00:00Z',
  user: {
    id: 123456,
    username: 'testuser',
    permalink_url: 'https://soundcloud.com/testuser',
    avatar_url: 'https://i1.sndcdn.com/avatars-000000000000-abcdef-large.jpg',
  },
  ...overrides,
});

export const createMockFollower = (overrides?: Partial<SoundCloudFollower>): SoundCloudFollower => ({
  id: 999888,
  permalink: 'follower',
  username: 'Test Follower',
  avatar_url: 'https://i1.sndcdn.com/avatars-000000000000-abcdef-large.jpg',
  followers_count: 500,
  track_count: 25,
  ...overrides,
});

export const createMockComment = (overrides?: Partial<SoundCloudComment>): SoundCloudComment => ({
  id: 111222,
  body: 'Test comment',
  timestamp: 60000, // 1 minute into track
  user: {
    id: 123456,
    username: 'testuser',
    avatar_url: 'https://i1.sndcdn.com/avatars-000000000000-abcdef-large.jpg',
    permalink_url: 'https://soundcloud.com/testuser',
  },
  ...overrides,
});

// ============================================================================
// React Testing Library Helpers
// ============================================================================

/**
 * Custom render function that wraps component with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <PlayerProvider>{children}</PlayerProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// ============================================================================
// Mock Fetch Helpers
// ============================================================================

/**
 * Create a mock fetch response
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response;
}

/**
 * Create a mock fetch error response
 */
export function createMockErrorResponse(error: string, status = 500): Response {
  return createMockResponse({ error }, status);
}

/**
 * Mock global fetch function
 */
export function mockFetch(mockImplementation: jest.Mock): void {
  global.fetch = mockImplementation;
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for a specific amount of time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Test Environment Helpers
// ============================================================================

/**
 * Set environment variables for tests
 */
export function setEnv(vars: Record<string, string>): void {
  Object.entries(vars).forEach(([key, value]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any)[key] = value;
  });
}

/**
 * Clear environment variables after tests
 */
export function clearEnv(keys: string[]): void {
  keys.forEach(key => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (process.env as any)[key];
  });
}

/**
 * Mock console methods to suppress output in tests
 */
export function suppressConsole(): {
  log: jest.SpyInstance;
  warn: jest.SpyInstance;
  error: jest.SpyInstance;
  restore: () => void;
} {
  const log = jest.spyOn(console, 'log').mockImplementation();
  const warn = jest.spyOn(console, 'warn').mockImplementation();
  const error = jest.spyOn(console, 'error').mockImplementation();

  return {
    log,
    warn,
    error,
    restore: () => {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    },
  };
}

// ============================================================================
// API Mock Helpers
// ============================================================================

/**
 * Create mock API route handlers
 */
export const mockApiRoutes = {
  profile: (user: SoundCloudUser, additionalData?: Partial<{
    spotlight: unknown[];
    playlists: SoundCloudPlaylist[];
    albums: SoundCloudPlaylist[];
    tracks: SoundCloudTrack[];
    reposts: SoundCloudTrack[];
  }>) => {
    return createMockResponse({
      profile: user,
      spotlight: additionalData?.spotlight || [],
      playlists: additionalData?.playlists || [],
      albums: additionalData?.albums || [],
      tracks: additionalData?.tracks || [],
      reposts: additionalData?.reposts || [],
    });
  },

  track: (track: SoundCloudTrack) => {
    return createMockResponse(track);
  },

  playlist: (playlist: SoundCloudPlaylist) => {
    return createMockResponse(playlist);
  },

  followers: (followers: SoundCloudFollower[], nextHref?: string) => {
    return createMockResponse({
      collection: followers,
      next_href: nextHref,
    });
  },

  search: (results: unknown[]) => {
    return createMockResponse({
      collection: results,
      total_results: results.length,
    });
  },
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

