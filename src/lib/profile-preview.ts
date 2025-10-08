/**
 * Profile preview data storage for optimistic loading
 * Stores minimal profile data in sessionStorage to enable instant UI rendering
 * while the full profile loads in the background
 */

export interface ProfilePreview {
  username: string;
  avatar: string;
  followers: number;
  handle: string;
  timestamp: number;
}

const STORAGE_KEY = 'soundground_profile_preview';
const PREVIEW_TTL = 5000; // 5 seconds

/**
 * Store preview data for a profile
 */
export function setProfilePreview(preview: Omit<ProfilePreview, 'timestamp'>): void {
  try {
    const data: ProfilePreview = {
      ...preview,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[ProfilePreview] Failed to store preview:', error);
  }
}

/**
 * Get preview data for a profile handle
 * Returns null if no preview exists, is expired, or is for a different profile
 */
export function getProfilePreview(handle: string): Omit<ProfilePreview, 'timestamp'> | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: ProfilePreview = JSON.parse(stored);
    
    // Check if preview is for the correct profile
    if (data.handle !== handle) {
      return null;
    }

    // Check if preview is still fresh
    const age = Date.now() - data.timestamp;
    if (age > PREVIEW_TTL) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      username: data.username,
      avatar: data.avatar,
      followers: data.followers,
      handle: data.handle,
    };
  } catch (error) {
    console.warn('[ProfilePreview] Failed to retrieve preview:', error);
    return null;
  }
}

/**
 * Clear stored preview data
 */
export function clearProfilePreview(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[ProfilePreview] Failed to clear preview:', error);
  }
}

