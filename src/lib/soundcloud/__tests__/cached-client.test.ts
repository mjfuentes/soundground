/**
 * @jest-environment node
 */
import * as cachedClient from '../cached-client';
import * as originalClient from '../client';
import { getCacheService, resetCacheService } from '@/lib/cache';
import { closeDatabase } from '@/lib/cache/database';

// Mock the original client
jest.mock('../client');

describe('Cached SoundCloud Client', () => {
  let cache: ReturnType<typeof getCacheService>;

  beforeEach(() => {
    // Ensure we start with a clean database for each test
    closeDatabase();
    resetCacheService();
    process.env.CACHE_DB_PATH = ':memory:';
    cache = getCacheService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    try {
      cache.clear();
    } catch {
      // Database might already be closed
    }
    closeDatabase();
    resetCacheService();
  });

  describe('resolveProfile', () => {
    const mockProfile = {
      id: 123,
      permalink: 'test-user',
      username: 'Test User',
      followers_count: 1000,
      followings_count: 500,
      track_count: 50,
      playlist_count: 10,
      verified: false,
      permalink_url: 'https://soundcloud.com/test-user',
    };

    it('should fetch and cache profile data', async () => {
      (originalClient.resolveProfile as jest.Mock).mockResolvedValue(mockProfile);

      const result = await cachedClient.resolveProfile('https://soundcloud.com/test-user');

      expect(result).toEqual(mockProfile);
      expect(originalClient.resolveProfile).toHaveBeenCalledTimes(1);
    });

    it('should return cached profile on second call', async () => {
      (originalClient.resolveProfile as jest.Mock).mockResolvedValue(mockProfile);

      const result1 = await cachedClient.resolveProfile('https://soundcloud.com/test-user');
      const result2 = await cachedClient.resolveProfile('https://soundcloud.com/test-user');

      expect(result1).toEqual(mockProfile);
      expect(result2).toEqual(mockProfile);
      expect(originalClient.resolveProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSpotlight', () => {
    const mockSpotlight = {
      collection: [
        {
          id: 1,
          title: 'Track 1',
          permalink_url: 'https://soundcloud.com/track1',
          duration: 180000,
          user: { id: 123, username: 'Test', permalink_url: 'https://soundcloud.com/test' },
        },
      ],
    };

    it('should fetch and cache spotlight data', async () => {
      (originalClient.getSpotlight as jest.Mock).mockResolvedValue(mockSpotlight);

      const result = await cachedClient.getSpotlight(123);

      expect(result).toEqual(mockSpotlight);
      expect(originalClient.getSpotlight).toHaveBeenCalledTimes(1);
      expect(originalClient.getSpotlight).toHaveBeenCalledWith(123);
    });

    it('should return cached spotlight on second call', async () => {
      (originalClient.getSpotlight as jest.Mock).mockResolvedValue(mockSpotlight);

      await cachedClient.getSpotlight(123);
      const result = await cachedClient.getSpotlight(123);

      expect(result).toEqual(mockSpotlight);
      expect(originalClient.getSpotlight).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPlaylists', () => {
    const mockPlaylists = {
      collection: [
        {
          id: 1,
          title: 'Playlist 1',
          permalink_url: 'https://soundcloud.com/playlist1',
          duration: 3600000,
          track_count: 20,
          is_album: false,
          user: { id: 123, username: 'Test', permalink_url: 'https://soundcloud.com/test' },
        },
      ],
    };

    it('should fetch and cache playlists', async () => {
      (originalClient.getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);

      const result = await cachedClient.getPlaylists(123);

      expect(result).toEqual(mockPlaylists);
      expect(originalClient.getPlaylists).toHaveBeenCalledWith(123, 200);
    });

    it('should cache playlists with different limits separately', async () => {
      (originalClient.getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);

      await cachedClient.getPlaylists(123, 100);
      await cachedClient.getPlaylists(123, 200);

      expect(originalClient.getPlaylists).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAlbums', () => {
    const mockAlbums = {
      collection: [
        {
          id: 1,
          title: 'Album 1',
          permalink_url: 'https://soundcloud.com/album1',
          duration: 3600000,
          track_count: 12,
          is_album: true,
          user: { id: 123, username: 'Test', permalink_url: 'https://soundcloud.com/test' },
        },
      ],
    };

    it('should fetch and cache albums', async () => {
      (originalClient.getAlbums as jest.Mock).mockResolvedValue(mockAlbums);

      const result = await cachedClient.getAlbums(123);

      expect(result).toEqual(mockAlbums);
      expect(originalClient.getAlbums).toHaveBeenCalledWith(123, 200);
    });

    it('should return cached albums on second call', async () => {
      (originalClient.getAlbums as jest.Mock).mockResolvedValue(mockAlbums);

      await cachedClient.getAlbums(123);
      const result = await cachedClient.getAlbums(123);

      expect(result).toEqual(mockAlbums);
      expect(originalClient.getAlbums).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFollowers', () => {
    const mockFollowers = {
      collection: [
        {
          id: 1,
          permalink: 'follower1',
          username: 'Follower 1',
          followers_count: 500,
        },
      ],
      next_href: 'https://api.soundcloud.com/next',
    };

    it('should fetch and cache followers', async () => {
      (originalClient.getFollowers as jest.Mock).mockResolvedValue(mockFollowers);

      const result = await cachedClient.getFollowers(123);

      expect(result).toEqual(mockFollowers);
      expect(originalClient.getFollowers).toHaveBeenCalledWith(123, 200, undefined);
    });

    it('should cache paginated followers separately', async () => {
      (originalClient.getFollowers as jest.Mock).mockResolvedValue(mockFollowers);

      await cachedClient.getFollowers(123, 200);
      await cachedClient.getFollowers(123, 200, 'https://api.soundcloud.com/next');

      expect(originalClient.getFollowers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate user cache', async () => {
      const mockData = { collection: [] };
      (originalClient.getSpotlight as jest.Mock).mockResolvedValue(mockData);
      (originalClient.getPlaylists as jest.Mock).mockResolvedValue(mockData);

      await cachedClient.getSpotlight(123);
      await cachedClient.getPlaylists(123);

      cachedClient.invalidateUserCache(123);

      // After invalidation, should fetch again
      await cachedClient.getSpotlight(123);
      
      // Should have been called twice (once before invalidation, once after)
      expect(originalClient.getSpotlight).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache statistics', () => {
    it('should return cache stats', async () => {
      const mockData = { collection: [] };
      (originalClient.getSpotlight as jest.Mock).mockResolvedValue(mockData);

      await cachedClient.getSpotlight(123);

      const stats = cachedClient.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.spotlight).toBeDefined();
    });
  });
});

