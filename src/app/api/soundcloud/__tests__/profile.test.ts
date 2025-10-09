/**
 * Tests for /api/soundcloud/profile endpoint
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../profile/route';
import { createMockUser, createMockTrack, createMockPlaylist } from '@/test-utils';

const mockResolveProfile = jest.fn();
const mockGetSpotlight = jest.fn();
const mockGetPlaylists = jest.fn();
const mockGetAlbums = jest.fn();
const mockGetTracks = jest.fn();
const mockGetReposts = jest.fn();

jest.mock('@/lib/soundcloud/smart-client', () => ({
  resolveProfile: (...args: unknown[]) => mockResolveProfile(...args),
  getSpotlight: (...args: unknown[]) => mockGetSpotlight(...args),
  getPlaylists: (...args: unknown[]) => mockGetPlaylists(...args),
  getAlbums: (...args: unknown[]) => mockGetAlbums(...args),
  getTracks: (...args: unknown[]) => mockGetTracks(...args),
  getReposts: (...args: unknown[]) => mockGetReposts(...args),
}));

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
    mockResolveProfile.mockResolvedValue(mockUser);
    mockGetSpotlight.mockResolvedValue({ collection: [] });
    mockGetPlaylists.mockResolvedValue({ collection: mockPlaylists });
    mockGetAlbums.mockResolvedValue({ collection: [] });
    mockGetTracks.mockResolvedValue({ collection: mockTracks });
    mockGetReposts.mockResolvedValue({ collection: [] });

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
    mockResolveProfile.mockRejectedValue(new Error('Profile not found'));

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/nonexistent');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch SoundCloud profile data');
  });

  it('should handle partial failures gracefully', async () => {
    // Profile succeeds but some requests fail
    mockResolveProfile.mockResolvedValue(mockUser);
    mockGetSpotlight.mockResolvedValue({ collection: [] });
    mockGetPlaylists.mockRejectedValue(new Error('Playlists failed'));
    mockGetAlbums.mockResolvedValue({ collection: [] });
    mockGetTracks.mockRejectedValue(new Error('Tracks failed'));
    mockGetReposts.mockResolvedValue({ collection: [] });

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
    mockResolveProfile.mockResolvedValue(mockUser);
    mockGetSpotlight.mockResolvedValue({ collection: [] });
    mockGetPlaylists.mockResolvedValue({ collection: [] });
    mockGetAlbums.mockResolvedValue({ collection: [] });
    mockGetTracks.mockResolvedValue({ collection: mockTracks });
    mockGetReposts.mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    await GET(request);

    // Verify getTracks was called with limit of 50
    expect(mockGetTracks).toHaveBeenCalledWith(mockUser.id, 50);
  });

  it('should limit reposts to 50', async () => {
    mockResolveProfile.mockResolvedValue(mockUser);
    mockGetSpotlight.mockResolvedValue({ collection: [] });
    mockGetPlaylists.mockResolvedValue({ collection: [] });
    mockGetAlbums.mockResolvedValue({ collection: [] });
    mockGetTracks.mockResolvedValue({ collection: [] });
    mockGetReposts.mockResolvedValue({ collection: [] });

    const request = new NextRequest('http://localhost/api/soundcloud/profile?url=https://soundcloud.com/testuser');
    await GET(request);

    // Verify getReposts was called with limit of 50
    expect(mockGetReposts).toHaveBeenCalledWith(mockUser.id, 50);
  });
});
