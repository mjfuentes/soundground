/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '../profile/route';
import * as smartClient from '@/lib/soundcloud/smart-client';
import { getCacheService, resetCacheService } from '@/lib/cache';
import { closeDatabase } from '@/lib/cache/database';

jest.mock('@/lib/soundcloud/smart-client');

describe('/api/soundcloud/profile', () => {
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

  it('should return 400 if url parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/soundcloud/profile');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'url' parameter");
  });

  it('should fetch and return profile data', async () => {
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

    const mockSpotlight = { collection: [] };
    const mockPlaylists = { collection: [] };
    const mockAlbums = { collection: [] };
    const mockTracks = { collection: [] };

    (smartClient.resolveProfile as jest.Mock).mockResolvedValue(mockProfile);
    (smartClient.getSpotlight as jest.Mock).mockResolvedValue(mockSpotlight);
    (smartClient.getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
    (smartClient.getAlbums as jest.Mock).mockResolvedValue(mockAlbums);
    (smartClient.getTracks as jest.Mock).mockResolvedValue(mockTracks);

    const request = new NextRequest('http://localhost:3000/api/soundcloud/profile?url=https://soundcloud.com/test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockProfile);
    expect(data.spotlight).toEqual([]);
    expect(data.playlists).toEqual([]);
    expect(data.albums).toEqual([]);
    expect(data.topFollowers).toBeUndefined(); // Friends are now loaded separately
  });

  it('should not include friends in profile response', async () => {
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

    (smartClient.resolveProfile as jest.Mock).mockResolvedValue(mockProfile);
    (smartClient.getSpotlight as jest.Mock).mockResolvedValue({ collection: [] });
    (smartClient.getPlaylists as jest.Mock).mockResolvedValue({ collection: [] });
    (smartClient.getAlbums as jest.Mock).mockResolvedValue({ collection: [] });
    (smartClient.getTracks as jest.Mock).mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost:3000/api/soundcloud/profile?url=https://soundcloud.com/test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockProfile);
    expect(data.topFollowers).toBeUndefined(); // Friends are loaded via separate endpoint
    
    // Verify followers/followings are not fetched in profile endpoint
    expect(smartClient.getFollowers).not.toHaveBeenCalled();
    expect(smartClient.getFollowings).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (smartClient.resolveProfile as jest.Mock).mockRejectedValue(new Error('API Error'));

    const request = new NextRequest('http://localhost:3000/api/soundcloud/profile?url=https://soundcloud.com/test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch SoundCloud profile data');
  });

  it('should handle partial errors in parallel requests', async () => {
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

    (smartClient.resolveProfile as jest.Mock).mockResolvedValue(mockProfile);
    (smartClient.getSpotlight as jest.Mock).mockRejectedValue(new Error('Spotlight error'));
    (smartClient.getPlaylists as jest.Mock).mockResolvedValue({ collection: [] });
    (smartClient.getAlbums as jest.Mock).mockResolvedValue({ collection: [] });
    (smartClient.getTracks as jest.Mock).mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost:3000/api/soundcloud/profile?url=https://soundcloud.com/test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockProfile);
    expect(data.spotlight).toEqual([]);
  });
});

