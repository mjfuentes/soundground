/**
 * Tests for /api/soundcloud/profile endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../profile/route';
import * as smartClient from '@/lib/soundcloud/smart-client';
import { createMockUser, createMockTrack, createMockPlaylist } from '@/test-utils';

// Mock the smart client
jest.mock('@/lib/soundcloud/smart-client');

describe('/api/soundcloud/profile', () => {
  const mockUser = createMockUser();
  const mockTracks = [createMockTrack(), createMockTrack({ id: 2, title: 'Track 2' })];
  const mockPlaylists = [createMockPlaylist()];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if url parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/soundcloud/profile');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'url' parameter");
  });

  it('should fetch and return profile data successfully', async () => {
    // Mock all the API calls
    jest.spyOn(smartClient, 'resolveProfile').mockResolvedValue(mockUser);
    jest.spyOn(smartClient, 'getSpotlight').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getPlaylists').mockResolvedValue({ collection: mockPlaylists });
    jest.spyOn(smartClient, 'getAlbums').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getTracks').mockResolvedValue({ collection: mockTracks });
    jest.spyOn(smartClient, 'getReposts').mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockUser);
    expect(data.tracks).toEqual(mockTracks);
    expect(data.playlists).toEqual(mockPlaylists);
    expect(data.spotlight).toEqual([]);
    expect(data.albums).toEqual([]);
    expect(data.reposts).toEqual([]);
  });

  it('should handle profile resolution errors', async () => {
    jest.spyOn(smartClient, 'resolveProfile').mockRejectedValue(new Error('Profile not found'));

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/nonexistent');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch SoundCloud profile data');
  });

  it('should handle partial failures gracefully', async () => {
    // Profile succeeds but some requests fail
    jest.spyOn(smartClient, 'resolveProfile').mockResolvedValue(mockUser);
    jest.spyOn(smartClient, 'getSpotlight').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getPlaylists').mockRejectedValue(new Error('Playlists failed'));
    jest.spyOn(smartClient, 'getAlbums').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getTracks').mockRejectedValue(new Error('Tracks failed'));
    jest.spyOn(smartClient, 'getReposts').mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    const response = await GET(request);
    const data = await response.json();

    // Should still return 200 with empty collections for failed requests
    expect(response.status).toBe(200);
    expect(data.profile).toEqual(mockUser);
    expect(data.playlists).toEqual([]);
    expect(data.tracks).toEqual([]);
  });

  it('should limit tracks to 50', async () => {
    jest.spyOn(smartClient, 'resolveProfile').mockResolvedValue(mockUser);
    jest.spyOn(smartClient, 'getSpotlight').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getPlaylists').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getAlbums').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getTracks').mockResolvedValue({ collection: mockTracks });
    jest.spyOn(smartClient, 'getReposts').mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    await GET(request);

    // Verify getTracks was called with limit of 50
    expect(smartClient.getTracks).toHaveBeenCalledWith(mockUser.id, 50);
  });

  it('should limit reposts to 50', async () => {
    jest.spyOn(smartClient, 'resolveProfile').mockResolvedValue(mockUser);
    jest.spyOn(smartClient, 'getSpotlight').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getPlaylists').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getAlbums').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getTracks').mockResolvedValue({ collection: [] });
    jest.spyOn(smartClient, 'getReposts').mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    await GET(request);

    // Verify getReposts was called with limit of 50
    expect(smartClient.getReposts).toHaveBeenCalledWith(mockUser.id, 50);
  });
});
