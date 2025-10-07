/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';
import { getCacheService, resetCacheService } from '@/lib/cache';
import { closeDatabase } from '@/lib/cache/database';

describe('/api/cache', () => {
  let cache: ReturnType<typeof getCacheService>;

  beforeEach(() => {
    // Ensure we start with a clean database for each test
    closeDatabase();
    resetCacheService();
    process.env.CACHE_DB_PATH = ':memory:';
    cache = getCacheService();
    try {
      cache.clear();
    } catch {
      // Database might not be initialized yet
    }
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

  describe('GET', () => {
    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/cache?action=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('should return cache stats', async () => {
      cache.set('test1', 'value1', { type: 'test' });
      cache.set('test2', 'value2', { type: 'test' });
      cache.get('test1'); // Hit
      cache.get('non-existent'); // Miss

      const request = new NextRequest('http://localhost:3000/api/cache?action=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.soundcloudStats).toBeDefined();
      expect(data.allStats).toBeDefined();
    });

    it('should return cache entries', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const request = new NextRequest('http://localhost:3000/api/cache?action=entries');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toBeDefined();
      expect(data.entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DELETE', () => {
    beforeEach(() => {
      cache.set('key1', 'value1', { type: 'type1' });
      cache.set('key2', 'value2', { type: 'type1' });
      cache.set('key3', 'value3', { type: 'type2' });
    });

    it('should delete a specific cache entry by key', async () => {
      const request = new NextRequest('http://localhost:3000/api/cache?key=key1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should return false when deleting non-existent key', async () => {
      const request = new NextRequest('http://localhost:3000/api/cache?key=non-existent');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
    });

    it('should delete entries by type', async () => {
      const request = new NextRequest('http://localhost:3000/api/cache?type=type1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    it('should clear all cache when no parameters provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/cache');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBeGreaterThanOrEqual(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });
  });
});

