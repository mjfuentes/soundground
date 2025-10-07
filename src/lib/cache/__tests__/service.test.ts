/**
 * @jest-environment node
 */
import { CacheService } from '../service';
import { closeDatabase } from '../database';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    // Use in-memory database for tests
    closeDatabase();
    process.env.CACHE_DB_PATH = ':memory:';
    cache = new CacheService();
  });

  afterEach(() => {
    try {
      cache.clear();
    } catch {
      // Database might already be closed
    }
    closeDatabase();
  });

  describe('Basic operations', () => {
    it('should set and get a value', () => {
      cache.set('test-key', { data: 'test-value' });
      const result = cache.get('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete a value', () => {
      cache.set('test-key', 'test-value');
      expect(cache.has('test-key')).toBe(true);
      
      const deleted = cache.delete('test-key');
      expect(deleted).toBe(true);
      expect(cache.has('test-key')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', () => {
      cache.set('test-key', 'test-value');
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should clear all cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const deleted = cache.clear();
      expect(deleted).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', () => {
      cache.set('test-key', 'test-value', { ttl: 100 }); // 100ms TTL
      expect(cache.has('test-key')).toBe(true);

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cache.has('test-key')).toBe(false);
          expect(cache.get('test-key')).toBeNull();
          resolve();
        }, 150);
      });
    });

    it('should use default TTL when not specified', () => {
      cache.set('test-key', 'test-value');
      const entries = cache.getAll();
      const entry = entries.find((e) => e.key === 'test-key');
      
      expect(entry).toBeDefined();
      expect(entry!.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should cleanup expired entries', () => {
      cache.set('expired', 'value', { ttl: 10 });
      cache.set('valid', 'value', { ttl: 10000 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const cleaned = cache.cleanup();
          expect(cleaned).toBeGreaterThan(0);
          expect(cache.has('expired')).toBe(false);
          expect(cache.has('valid')).toBe(true);
          resolve();
        }, 50);
      });
    });
  });

  describe('Type categorization', () => {
    it('should categorize cache entries by type', () => {
      cache.set('profile:1', { id: 1 }, { type: 'profile' });
      cache.set('playlist:1', { id: 1 }, { type: 'playlist' });
      cache.set('playlist:2', { id: 2 }, { type: 'playlist' });

      const entries = cache.getAll();
      const profiles = entries.filter((e) => e.type === 'profile');
      const playlists = entries.filter((e) => e.type === 'playlist');

      expect(profiles).toHaveLength(1);
      expect(playlists).toHaveLength(2);
    });

    it('should delete entries by type', () => {
      cache.set('profile:1', { id: 1 }, { type: 'profile' });
      cache.set('profile:2', { id: 2 }, { type: 'profile' });
      cache.set('playlist:1', { id: 1 }, { type: 'playlist' });

      const deleted = cache.deleteByType('profile');
      expect(deleted).toBe(2);
      expect(cache.has('profile:1')).toBe(false);
      expect(cache.has('profile:2')).toBe(false);
      expect(cache.has('playlist:1')).toBe(true);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cache.set('test-key', 'cached-value');
      
      const factory = jest.fn().mockResolvedValue('new-value');
      const result = await cache.getOrSet('test-key', factory);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = jest.fn().mockResolvedValue('new-value');
      const result = await cache.getOrSet('test-key', factory);

      expect(result).toBe('new-value');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get('test-key')).toBe('new-value');
    });

    it('should handle factory errors', async () => {
      const factory = jest.fn().mockRejectedValue(new Error('Factory error'));
      
      await expect(cache.getOrSet('test-key', factory)).rejects.toThrow('Factory error');
      expect(cache.has('test-key')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1', { type: 'test' });
      
      // Hit
      cache.get('key1');
      cache.get('key1');
      
      // Miss
      cache.get('non-existent');

      const stats = cache.getStatsByType('test');
      expect(stats).toBeDefined();
      // Should have at least 2 hits
      expect(stats!.hit_count).toBeGreaterThanOrEqual(2);
    });

    it('should return all statistics', () => {
      cache.set('profile:1', { id: 1 }, { type: 'profile' });
      cache.set('playlist:1', { id: 1 }, { type: 'playlist' });

      cache.get('profile:1');
      cache.get('playlist:1');
      cache.get('non-existent');

      const allStats = cache.getStats();
      expect(allStats.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent type stats', () => {
      const stats = cache.getStatsByType('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Complex data types', () => {
    it('should handle objects', () => {
      const data = { id: 1, name: 'Test', nested: { value: 'nested' } };
      cache.set('object', data);
      expect(cache.get('object')).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3, { id: 4 }];
      cache.set('array', data);
      expect(cache.get('array')).toEqual(data);
    });

    it('should handle null values', () => {
      cache.set('null', null);
      expect(cache.get('null')).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all non-expired entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const all = cache.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((e) => e.key)).toContain('key1');
      expect(all.map((e) => e.key)).toContain('key2');
      expect(all.map((e) => e.key)).toContain('key3');
    });

    it('should not return expired entries', () => {
      cache.set('valid', 'value', { ttl: 10000 });
      cache.set('expired', 'value', { ttl: 10 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const all = cache.getAll();
          expect(all.map((e) => e.key)).toContain('valid');
          expect(all.map((e) => e.key)).not.toContain('expired');
          resolve();
        }, 50);
      });
    });
  });
});

