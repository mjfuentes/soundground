import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist, SpotlightItem } from '@/lib/soundcloud/client';

export interface CachedProfileData {
  profile: SoundCloudUser;
  spotlight: SpotlightItem[];
  playlists: SoundCloudPlaylist[];
  albums: SoundCloudPlaylist[];
  tracks: SoundCloudTrack[];
  timestamp: number;
}

export interface ProfileDiff {
  newTracks: number;
  removedTracks: number;
  newAlbums: number;
  removedAlbums: number;
  newPlaylists: number;
  removedPlaylists: number;
  newSpotlight: number;
  hasChanges: boolean;
}

const CACHE_KEY_PREFIX = 'soundground_profile_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Client-side profile cache with diff detection
 */
export class ClientProfileCache {
  private static getCacheKey(handle: string): string {
    return `${CACHE_KEY_PREFIX}${handle.toLowerCase()}`;
  }

  /**
   * Get cached profile data
   */
  static get(handle: string): CachedProfileData | null {
    if (typeof window === 'undefined') return null;
    
    const key = this.getCacheKey(handle);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;

    try {
      const data: CachedProfileData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - data.timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Set cached profile data
   */
  static set(handle: string, data: Omit<CachedProfileData, 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    
    const key = this.getCacheKey(handle);
    const cacheData: CachedProfileData = {
      ...data,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache profile:', error);
    }
  }

  /**
   * Compare cached vs fresh data and detect differences
   */
  static diff(cached: CachedProfileData, fresh: Omit<CachedProfileData, 'timestamp'>): ProfileDiff {
    const cachedTrackIds = new Set(cached.tracks.map(t => t.id));
    const freshTrackIds = new Set(fresh.tracks.map(t => t.id));
    
    const cachedAlbumIds = new Set(cached.albums.map(a => a.id));
    const freshAlbumIds = new Set(fresh.albums.map(a => a.id));
    
    const cachedPlaylistIds = new Set(cached.playlists.map(p => p.id));
    const freshPlaylistIds = new Set(fresh.playlists.map(p => p.id));
    
    const cachedSpotlightIds = new Set(cached.spotlight.map(s => s.id));
    const freshSpotlightIds = new Set(fresh.spotlight.map(s => s.id));

    const newTracks = fresh.tracks.filter(t => !cachedTrackIds.has(t.id)).length;
    const removedTracks = cached.tracks.filter(t => !freshTrackIds.has(t.id)).length;
    
    const newAlbums = fresh.albums.filter(a => !cachedAlbumIds.has(a.id)).length;
    const removedAlbums = cached.albums.filter(a => !freshAlbumIds.has(a.id)).length;
    
    const newPlaylists = fresh.playlists.filter(p => !cachedPlaylistIds.has(p.id)).length;
    const removedPlaylists = cached.playlists.filter(p => !freshPlaylistIds.has(p.id)).length;
    
    const newSpotlight = fresh.spotlight.filter(s => !cachedSpotlightIds.has(s.id)).length;

    return {
      newTracks,
      removedTracks,
      newAlbums,
      removedAlbums,
      newPlaylists,
      removedPlaylists,
      newSpotlight,
      hasChanges: newTracks > 0 || removedTracks > 0 || newAlbums > 0 || 
                  removedAlbums > 0 || newPlaylists > 0 || removedPlaylists > 0 || 
                  newSpotlight > 0,
    };
  }

  /**
   * Clear cache for a specific profile
   */
  static clear(handle: string): void {
    if (typeof window === 'undefined') return;
    const key = this.getCacheKey(handle);
    localStorage.removeItem(key);
  }

  /**
   * Clear all profile caches
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

