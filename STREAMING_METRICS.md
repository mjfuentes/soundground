# SoundCloud Streaming Metrics

## Overview
CloudMate now displays comprehensive streaming and engagement metrics for SoundCloud profiles, including per-track, per-album, and per-playlist statistics.

## Available Metrics

### Track Metrics
Each track displays the following engagement metrics (when available):

- **Plays** (playback_count): Total number of times the track has been played
- **Likes** (likes_count): Number of likes the track has received
- **Reposts** (reposts_count): Number of times the track has been reposted
- **Comments** (comment_count): Number of comments on the track

### Album/Playlist Metrics
Albums and playlists display:

- **Plays** (playback_count): Total playback count for the album/playlist
- **Likes** (likes_count): Number of likes
- **Reposts** (reposts_count): Number of reposts
- **Track Count**: Number of tracks in the album/playlist

### Profile-Wide Statistics
A comprehensive stats card shows aggregated metrics across all content:

- **Total Plays**: Sum of all playback counts across all tracks
- **Total Likes**: Sum of likes across tracks, playlists, and albums
- **Total Reposts**: Sum of reposts across all content
- **Total Comments**: Sum of all comments on tracks
- **Most Popular Track**: Highlights the track with the highest play count

## UI Components

### TrackCard Component
Located at: `src/components/track-card.tsx`

Displays individual tracks with:
- Album artwork (or fallback icon)
- Track title and duration
- Genre (if available)
- All engagement metrics with icons

### AlbumCard Component
Located at: `src/components/album-card.tsx`

Displays albums/playlists with:
- Album artwork (or fallback icon)
- Album/playlist title
- Track count
- Engagement metrics

### ProfileStats Component
Located at: `src/components/profile-stats.tsx`

Displays aggregate statistics in a prominent card in the left sidebar, including:
- Grid of key metrics (plays, likes, reposts, comments)
- Most popular track highlight
- Only displays if data is available

## API Enhancements

### Updated Endpoints

#### GET /api/soundcloud/profile
Now fetches and returns:
- User profile data
- Spotlight tracks
- Playlists (with metrics)
- Albums (with metrics)
- **NEW**: Up to 50 recent tracks with full metrics
- Top followers

#### NEW: GET /api/soundcloud/tracks
Dedicated endpoint for fetching tracks by user ID:
- Query params: `userId` (required), `limit` (optional, default 200)
- Returns all tracks with engagement metrics

### Updated Interfaces

#### SoundCloudTrack Interface
```typescript
export interface SoundCloudTrack {
  id: number;
  title: string;
  permalink_url: string;
  artwork_url?: string;
  duration: number;
  playback_count?: number;      // ← Streaming metric
  likes_count?: number;          // ← Engagement metric
  reposts_count?: number;        // ← NEW: Engagement metric
  comment_count?: number;        // ← NEW: Engagement metric
  description?: string;
  genre?: string;
  created_at?: string;           // ← NEW: Track age
  user: {
    id: number;
    username: string;
    permalink_url: string;
  };
}
```

#### SoundCloudPlaylist Interface
```typescript
export interface SoundCloudPlaylist {
  id: number;
  title: string;
  permalink_url: string;
  artwork_url?: string;
  description?: string;
  duration: number;
  track_count: number;
  likes_count?: number;          // ← Engagement metric
  reposts_count?: number;        // ← NEW: Engagement metric
  playback_count?: number;       // ← NEW: Streaming metric
  is_album: boolean;
  created_at?: string;           // ← NEW: Album age
  user: {
    id: number;
    username: string;
    permalink_url: string;
  };
}
```

## Formatting Utilities

All numbers are formatted for readability:
- 1,000+ → "1.0K"
- 1,000,000+ → "1.0M"
- Durations formatted as "MM:SS"

## Visual Design

### Icons
Each metric uses distinctive icons:
- **Play**: ▶ (play triangle)
- **Likes**: ♥ (heart)
- **Reposts**: ↻ (circular arrows)
- **Comments**: 💬 (speech bubble)

### Color Scheme
- Stats card: Purple gradient with border (`from-purple-500/10`)
- Track cards: White/5 background with hover effects
- Album cards: Hover scale animation
- All metrics: Zinc-400/500 for secondary text

## Data Sources

All metrics are fetched directly from the SoundCloud API v2:
- Base URL: `https://api-v2.soundcloud.com`
- Endpoints:
  - `/users/{userId}/tracks` - Individual tracks with metrics
  - `/users/{userId}/playlists_without_albums` - Playlists with metrics
  - `/users/{userId}/albums` - Albums with metrics
  - `/users/{userId}/spotlight` - Featured tracks

## Caching

All streaming metrics are cached using the existing cache system:
- Tracks: 5 minutes TTL (same as other content)
- Cache key includes user ID for proper invalidation
- Located in: `src/lib/soundcloud/cached-client.ts`

## Example Usage

When viewing a SoundCloud profile at `/[handle]`, the app will:

1. Fetch the user profile
2. Load all content (tracks, playlists, albums, spotlight)
3. Calculate aggregate statistics
4. Display stats card in left sidebar (if data available)
5. Show "Recent Tracks" section with top 10 tracks and full metrics
6. Display albums/playlists with engagement metrics

## Performance Considerations

- Limited to 50 tracks per profile load to avoid overwhelming the UI
- All API calls are parallelized using `Promise.all()`
- Caching reduces API calls for frequently viewed profiles
- Metrics only displayed when data is available (graceful degradation)

## Future Enhancements

Potential additions:
- Track sorting by different metrics (most played, most liked, etc.)
- Time-based filtering (e.g., last 30 days)
- Charts showing metric trends over time
- Download counts (if/when available via API)
- Comparison between multiple artists
- Export metrics to CSV/JSON

