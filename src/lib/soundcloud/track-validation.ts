// Shared track validation logic (works in both client and server)

export interface TrackValidationFields {
  id?: number;
  title?: string;
  permalink_url?: string;
  duration?: number;
  streamable?: boolean;
  access?: "playable" | "preview" | "blocked";
}

// Helper function to check if a track is playable
export function isTrackPlayable(track: unknown): boolean {
  if (!track || typeof track !== 'object') return false;
  const t = track as Partial<TrackValidationFields>;
  
  // Basic required fields
  if (!t.id || !t.title || !t.permalink_url) return false;
  if (typeof t.duration !== 'number' || t.duration <= 0) return false;
  
  // Check if track is explicitly blocked
  if (t.access === "blocked") return false;
  
  // Check if track is streamable (undefined is treated as true for backwards compatibility)
  if (t.streamable === false && t.access !== "preview") return false;
  
  return true;
}

