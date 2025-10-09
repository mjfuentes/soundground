/**
 * Tests for /api/soundcloud/search endpoint
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../search/route';
import { createMockUser, createMockTrack } from '@/test-utils';

const mockSearch = jest.fn();
jest.mock('@/lib/soundcloud/smart-client', () => ({
  search: (...args: unknown[]) => mockSearch(...args),
}));

describe('/api/soundcloud/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if query parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/soundcloud/search');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'q' parameter");
  });

  it('should search successfully with default parameters', async () => {
    const mockResults = [
      createMockUser(),
      createMockTrack(),
    ];

    mockSearch.mockResolvedValue({
      collection: mockResults,
      total_results: 2,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collection).toEqual(mockResults);
    expect(data.total_results).toBe(2);
    
    // Verify default parameters
    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      limit: 20,
      offset: 0,
    }));
  });

  it('should accept custom limit and offset', async () => {
    mockSearch.mockResolvedValue({
      collection: [],
      total_results: 0,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?q=test&limit=50&offset=100');
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      limit: 50,
      offset: 100,
    }));
  });

  it('should accept filter parameter', async () => {
    mockSearch.mockResolvedValue({
      collection: [],
      total_results: 0,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?q=test&filter=tracks');
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('test', {
      limit: 20,
      offset: 0,
      filter: 'tracks',
    });
  });

  it('should handle search errors', async () => {
    mockSearch.mockRejectedValue(new Error('Search failed'));

    const request = new NextRequest('http://localhost/api/soundcloud/search?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to search SoundCloud');
  });

  it('should handle empty query string', async () => {
    const request = new NextRequest('http://localhost/api/soundcloud/search?q=');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'q' parameter");
  });
});

