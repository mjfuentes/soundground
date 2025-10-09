/**
 * Tests for /api/soundcloud/search endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../search/route';
import * as smartClient from '@/lib/soundcloud/smart-client';
import { createMockUser, createMockTrack } from '@/test-utils';

jest.mock('@/lib/soundcloud/smart-client');

describe('/api/soundcloud/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if query parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/soundcloud/search');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'query' parameter");
  });

  it('should search successfully with default parameters', async () => {
    const mockResults = [
      createMockUser(),
      createMockTrack(),
    ];

    jest.spyOn(smartClient, 'search').mockResolvedValue({
      collection: mockResults,
      total_results: 2,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?query=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.collection).toEqual(mockResults);
    expect(data.total_results).toBe(2);
    
    // Verify default parameters
    expect(smartClient.search).toHaveBeenCalledWith('test', {
      limit: 20,
      offset: 0,
    });
  });

  it('should accept custom limit and offset', async () => {
    jest.spyOn(smartClient, 'search').mockResolvedValue({
      collection: [],
      total_results: 0,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?query=test&limit=50&offset=100');
    await GET(request);

    expect(smartClient.search).toHaveBeenCalledWith('test', {
      limit: 50,
      offset: 100,
    });
  });

  it('should accept filter parameter', async () => {
    jest.spyOn(smartClient, 'search').mockResolvedValue({
      collection: [],
      total_results: 0,
    });

    const request = new NextRequest('http://localhost/api/soundcloud/search?query=test&filter=tracks');
    await GET(request);

    expect(smartClient.search).toHaveBeenCalledWith('test', {
      limit: 20,
      offset: 0,
      filter: 'tracks',
    });
  });

  it('should handle search errors', async () => {
    jest.spyOn(smartClient, 'search').mockRejectedValue(new Error('Search failed'));

    const request = new NextRequest('http://localhost/api/soundcloud/search?query=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to search SoundCloud');
  });

  it('should handle empty query string', async () => {
    const request = new NextRequest('http://localhost/api/soundcloud/search?query=');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing 'query' parameter");
  });
});

