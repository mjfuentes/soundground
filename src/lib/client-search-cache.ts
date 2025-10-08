import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from '@/lib/soundcloud/client';

interface CachedSearchResult {
  query: string;
  results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'soundground_search_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for client-side cache

/**
 * Client-side search cache using localStorage for instant results
 */
export class ClientSearchCache {
  private static getCacheKey(query: string): string {
    return `${CACHE_KEY_PREFIX}${query.toLowerCase().trim()}`;
  }

  /**
   * Get cached results for a query
   */
  static get(query: string): (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[] | null {
    if (typeof window === 'undefined') return null;
    
    const key = this.getCacheKey(query);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;

    try {
      const data: CachedSearchResult = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - data.timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data.results;
    } catch {
      // Invalid cache data, remove it
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Set cached results for a query
   */
  static set(query: string, results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]): void {
    if (typeof window === 'undefined') return;
    
    const key = this.getCacheKey(query);
    const data: CachedSearchResult = {
      query: query.trim(),
      results,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // localStorage might be full, clear old entries
      this.cleanup();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Still failing, ignore
        console.warn('Failed to cache search results:', error);
      }
    }
  }

  /**
   * Check if results are different (deep comparison of IDs)
   */
  static areResultsDifferent(
    cached: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[],
    fresh: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]
  ): boolean {
    if (cached.length !== fresh.length) return true;
    
    const cachedIds = cached.map(item => item.id);
    const freshIds = fresh.map(item => item.id);
    
    return cachedIds.some((id, index) => id !== freshIds[index]);
  }

  /**
   * Clean up expired cache entries
   */
  static cleanup(): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (!key.startsWith(CACHE_KEY_PREFIX)) return;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) return;
        
        const data: CachedSearchResult = JSON.parse(cached);
        if (now - data.timestamp > CACHE_TTL) {
          localStorage.removeItem(key);
        }
      } catch {
        // Invalid data, remove it
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Clear all search cache
   */
  static clear(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

