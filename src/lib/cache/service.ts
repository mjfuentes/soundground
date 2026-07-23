import { getDatabase, cleanupExpiredCache } from './database';
import type Database from 'better-sqlite3';

export interface CacheOptions {
  ttl?: number; // Freshness window in milliseconds
  type?: string; // Cache type for categorization
  /**
   * Stale-while-revalidate: how long past freshness the entry is retained
   * and may be served instantly while a background refresh runs. Omit (or 0)
   * for the classic behavior: fresh or gone.
   */
  staleTtl?: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  type: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

interface CacheRow {
  key: string;
  value: string;
  type: string;
  expires_at: number;
  fresh_until: number | null;
  created_at: number;
  updated_at: number;
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

  private readonly refreshesInFlight = new Map<string, Promise<void>>();

  private readRow(key: string): CacheRow | undefined {
    return this.db.prepare('SELECT * FROM cache WHERE key = ?').get(key) as CacheRow | undefined;
  }

  /**
   * Get a FRESH value from cache. Stale-but-retained entries are not
   * returned here — only getOrSet serves those (with a background refresh).
   */
  get<T = unknown>(key: string): T | null {
    const now = Date.now();
    const row = this.readRow(key);

    if (row && (row.fresh_until ?? row.expires_at) > now) {
      this.updateStats(row.type, 'hit');
      return JSON.parse(row.value) as T;
    }

    // Fully expired rows are removed by cleanup(); stale-window rows must
    // survive this read so getOrSet can still serve them.
    this.updateStats(this.inferTypeFromKey(key), 'miss');
    return null;
  }

  /**
   * Infer cache type from key pattern (for miss accounting — hits carry
   * their stored type). Keys look like "profile:<url>" from the api-v2
   * cached client or "official:profile:<url>" from the official one.
   */
  private inferTypeFromKey(key: string): string {
    const k = key.startsWith('official:') ? key.slice('official:'.length) : key;
    if (k.startsWith('profile:')) return 'soundcloud:profile';
    if (k.startsWith('tracks:') || k.startsWith('track:') || k.startsWith('reposts:')) return 'soundcloud:tracks';
    if (k.startsWith('playlists:') || k.startsWith('playlist:') || k.startsWith('albums:')) return 'soundcloud:playlists';
    if (k.startsWith('followers:') || k.startsWith('followings:')) return 'soundcloud:followers';
    if (k.startsWith('spotlight:')) return 'soundcloud:spotlight';
    if (k.startsWith('search:')) return 'soundcloud:search';
    if (k.startsWith('streams:')) return 'soundcloud:streams';
    if (k.startsWith('user:') && k.endsWith(':all-following-ids')) return 'followings_set';
    return DEFAULT_TYPE;
  }

  /**
   * Read a retained value regardless of freshness (stale entries included,
   * up to the hard retention deadline). For offline tooling like backfills
   * whose premise is "reuse whatever's on disk". No stats, no refresh.
   */
  peekRetained<T = unknown>(key: string): T | null {
    const row = this.readRow(key);
    if (row && row.expires_at > Date.now()) {
      return JSON.parse(row.value) as T;
    }
    return null;
  }

  /**
   * Like peekRetained but extracts one JSON field in SQL — no full-object
   * parse. Built for bulk cache-only reads (thousands of avatar lookups
   * per render). `path` is a json_extract path without the leading `$.`.
   */
  peekRetainedField(key: string, path: string): string | null {
    const row = this.db
      .prepare(
        `SELECT json_extract(value, ?) AS field FROM cache WHERE key = ? AND expires_at > ?`,
      )
      .get(`$.${path}`, key, Date.now()) as { field: string | null } | undefined;
    return row?.field ?? null;
  }

  /**
   * Set a value in cache
   */
  set<T = unknown>(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl || DEFAULT_TTL;
    const type = options.type || DEFAULT_TYPE;
    const freshUntil = now + ttl;
    const expiresAt = freshUntil + (options.staleTtl ?? 0);

    this.db
      .prepare(
        `INSERT INTO cache (key, value, type, expires_at, fresh_until, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           type = excluded.type,
           expires_at = excluded.expires_at,
           fresh_until = excluded.fresh_until,
           updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), type, expiresAt, freshUntil, now, now);
  }

  /**
   * Get or set a value using a factory. Fresh entries return immediately;
   * stale-but-retained entries return immediately AND trigger a deduped
   * background refresh; anything else awaits the factory.
   */
  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const now = Date.now();
    const row = this.readRow(key);

    if (row && (row.fresh_until ?? row.expires_at) > now) {
      this.updateStats(row.type, 'hit');
      return JSON.parse(row.value) as T;
    }

    if (row && row.expires_at > now) {
      // Stale but retained: serve instantly, refresh in the background.
      this.updateStats(row.type, 'hit');
      this.refreshInBackground(key, factory, options);
      return JSON.parse(row.value) as T;
    }

    this.updateStats(this.inferTypeFromKey(key), 'miss');
    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  private refreshInBackground<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): void {
    if (this.refreshesInFlight.has(key)) return;
    const refresh = factory()
      .then((value) => {
        this.set(key, value, options);
      })
      .catch((error) => {
        console.error(`[cache] background refresh failed for ${key}:`, error);
      })
      .finally(() => {
        this.refreshesInFlight.delete(key);
      });
    this.refreshesInFlight.set(key, refresh);
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
   * Check if a key exists and is still fresh
   */
  has(key: string): boolean {
    const now = Date.now();
    const row = this.db
      .prepare('SELECT 1 FROM cache WHERE key = ? AND COALESCE(fresh_until, expires_at) > ?')
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

