import { getDatabase, cleanupExpiredCache } from './database';
import type Database from 'better-sqlite3';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  type?: string; // Cache type for categorization
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  type: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface CacheStats {
  type: string;
  hit_count: number;
  miss_count: number;
  last_accessed: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TYPE = 'general';

export class CacheService {
  public readonly db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get a value from cache
   */
  get<T = unknown>(key: string): T | null {
    const now = Date.now();
    const row = this.db
      .prepare('SELECT * FROM cache WHERE key = ? AND expires_at > ?')
      .get(key, now) as { key: string; value: string; type: string; expires_at: number; created_at: number; updated_at: number } | undefined;

    if (row) {
      this.updateStats(row.type, 'hit');
      return JSON.parse(row.value) as T;
    }

    // Try to infer type from key pattern for accurate miss tracking
    const inferredType = this.inferTypeFromKey(key);
    
    // If key exists but expired, delete it
    this.db.prepare('DELETE FROM cache WHERE key = ? AND expires_at <= ?').run(key, now);
    this.updateStats(inferredType, 'miss');
    return null;
  }

  /**
   * Infer cache type from key pattern
   */
  private inferTypeFromKey(key: string): string {
    if (key.startsWith('soundcloud:profile:')) return 'soundcloud:profile';
    if (key.startsWith('soundcloud:tracks:')) return 'soundcloud:tracks';
    if (key.startsWith('soundcloud:playlists:')) return 'soundcloud:playlists';
    if (key.startsWith('soundcloud:albums:')) return 'soundcloud:albums';
    if (key.startsWith('soundcloud:followers:')) return 'soundcloud:followers';
    if (key.startsWith('soundcloud:spotlight:')) return 'soundcloud:spotlight';
    if (key.startsWith('soundcloud:search:')) return 'soundcloud:search';
    if (key.startsWith('followings_set:')) return 'followings_set';
    return DEFAULT_TYPE;
  }

  /**
   * Set a value in cache
   */
  set<T = unknown>(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl || DEFAULT_TTL;
    const type = options.type || DEFAULT_TYPE;
    const expiresAt = now + ttl;

    this.db
      .prepare(
        `INSERT INTO cache (key, value, type, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           type = excluded.type,
           expires_at = excluded.expires_at,
           updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), type, expiresAt, now, now);
  }

  /**
   * Get or set a value in cache using a factory function
   */
  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const result = this.db.prepare('DELETE FROM cache WHERE key = ?').run(key);
    return result.changes > 0;
  }

  /**
   * Delete all cache entries of a specific type
   */
  deleteByType(type: string): number {
    const result = this.db.prepare('DELETE FROM cache WHERE type = ?').run(type);
    return result.changes;
  }

  /**
   * Delete all cache entries
   */
  clear(): number {
    const result = this.db.prepare('DELETE FROM cache').run();
    this.db.prepare('DELETE FROM cache_stats').run();
    return result.changes;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const now = Date.now();
    const row = this.db
      .prepare('SELECT 1 FROM cache WHERE key = ? AND expires_at > ?')
      .get(key, now);
    return row !== undefined;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats[] {
    return this.db.prepare('SELECT * FROM cache_stats').all() as CacheStats[];
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.db.prepare('DELETE FROM cache_stats').run();
  }

  /**
   * Get cache statistics for a specific type
   */
  getStatsByType(type: string): CacheStats | null {
    const row = this.db
      .prepare('SELECT * FROM cache_stats WHERE type = ?')
      .get(type) as CacheStats | undefined;
    return row || null;
  }

  /**
   * Get all cache entries (for debugging)
   */
  getAll(): CacheEntry[] {
    const now = Date.now();
    const rows = this.db
      .prepare('SELECT * FROM cache WHERE expires_at > ?')
      .all(now) as Array<{
        key: string;
        value: string;
        type: string;
        expires_at: number;
        created_at: number;
        updated_at: number;
      }>;

    return rows.map((row) => ({
      key: row.key,
      value: JSON.parse(row.value),
      type: row.type,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    return cleanupExpiredCache();
  }

  /**
   * Update cache statistics
   */
  private updateStats(type: string, action: 'hit' | 'miss'): void {
    const now = Date.now();
    const column = action === 'hit' ? 'hit_count' : 'miss_count';

    this.db
      .prepare(
        `INSERT INTO cache_stats (type, ${column}, last_accessed)
         VALUES (?, 1, ?)
         ON CONFLICT(type) DO UPDATE SET
           ${column} = ${column} + 1,
           last_accessed = excluded.last_accessed`
      )
      .run(type, now);
  }
}

// Singleton instance
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  // Always create a new instance if the old one's database is closed
  if (cacheService) {
    try {
      // Test if the database is still open by trying to run a simple query
      cacheService.db.prepare('SELECT 1').get();
    } catch {
      // Database is closed, reset the singleton
      cacheService = null;
    }
  }
  
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}

export function resetCacheService(): void {
  cacheService = null;
}

