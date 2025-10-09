# SoundGround API Documentation

Complete reference for all API endpoints in the SoundGround application.

## Table of Contents

- [Authentication](#authentication)
- [SoundCloud Endpoints](#soundcloud-endpoints)
- [Cache Management](#cache-management)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

SoundGround uses SoundCloud OAuth 2.0 for authentication. All API endpoints (except auth endpoints) require a valid session cookie.

### Login Flow

#### `GET /api/auth/login`

Initiates the OAuth login flow.

**Query Parameters:**
- None

**Response:**
- **302** - Redirects to SoundCloud authorization page

**Example:**
```bash
curl http://localhost:3000/api/auth/login
```

---

#### `GET /api/auth/callback`

OAuth callback endpoint. Handles the authorization code exchange.

**Query Parameters:**
- `code` (required) - Authorization code from SoundCloud
- `state` (required) - CSRF token for validation

**Response:**
- **302** - Redirects to home page with session cookie
- **400** - Missing or invalid parameters
- **500** - Token exchange failed

---

#### `GET /api/auth/logout`

Logs out the current user by clearing the session cookie.

**Response:**
- **200** - Session cleared successfully

**Example:**
```bash
curl -X GET http://localhost:3000/api/auth/logout \
  -H "Cookie: session=..."
```

---

#### `GET /api/auth/me`

Returns the current authenticated user's information.

**Response:**
```json
{
  "userId": 123456,
  "username": "testuser",
  "accessToken": "..."
}
```

**Status Codes:**
- **200** - Success
- **401** - Not authenticated

---

## SoundCloud Endpoints

All SoundCloud endpoints proxy requests to the SoundCloud API with proper authentication and caching.

### Profile Data

#### `GET /api/soundcloud/profile`

Fetches complete profile data for a SoundCloud user.

**Query Parameters:**
- `url` (required) - SoundCloud profile URL

**Response:**
```json
{
  "profile": {
    "id": 123456,
    "username": "artist",
    "permalink": "artist",
    "permalink_url": "https://soundcloud.com/artist",
    "avatar_url": "https://...",
    "description": "Artist bio",
    "followers_count": 10000,
    "followings_count": 500,
    "track_count": 100,
    "playlist_count": 10,
    "verified": false
  },
  "spotlight": [],
  "playlists": [],
  "albums": [],
  "tracks": [],
  "reposts": []
}
```

**Status Codes:**
- **200** - Success
- **400** - Missing url parameter
- **500** - Failed to fetch profile

**Example:**
```bash
curl "http://localhost:3000/api/soundcloud/profile?url=https://soundcloud.com/artist" \
  -H "Cookie: session=..."
```

**Caching:**
- TTL: 30 minutes
- Type: `profile`

---

#### `GET /api/soundcloud/resolve`

Resolves a SoundCloud URL to user data.

**Query Parameters:**
- `url` (required) - SoundCloud URL to resolve

**Response:**
```json
{
  "id": 123456,
  "username": "artist",
  "permalink": "artist",
  ...
}
```

**Status Codes:**
- **200** - Success
- **400** - Missing url parameter
- **500** - Resolution failed

---

### Tracks

#### `GET /api/soundcloud/tracks`

Fetches tracks for a user.

**Query Parameters:**
- `userId` (required) - SoundCloud user ID
- `limit` (optional) - Number of tracks (default: 50)

**Response:**
```json
{
  "collection": [
    {
      "id": 789012,
      "title": "Track Title",
      "permalink_url": "https://soundcloud.com/artist/track",
      "artwork_url": "https://...",
      "duration": 180000,
      "playback_count": 5000,
      "likes_count": 250,
      "streamable": true,
      "user": { ... }
    }
  ]
}
```

**Status Codes:**
- **200** - Success
- **400** - Missing userId parameter
- **500** - Failed to fetch tracks

**Caching:**
- TTL: 15 minutes
- Type: `tracks`

---

#### `GET /api/soundcloud/track/[trackId]`

Fetches detailed information for a specific track.

**Path Parameters:**
- `trackId` - Track ID

**Response:**
```json
{
  "id": 789012,
  "title": "Track Title",
  "description": "Track description",
  "duration": 180000,
  "streamable": true,
  ...
}
```

**Status Codes:**
- **200** - Success
- **404** - Track not found
- **500** - Failed to fetch track

---

#### `GET /api/soundcloud/stream/[trackId]`

Fetches the stream URL for a track.

**Path Parameters:**
- `trackId` - Track ID

**Response:**
```json
{
  "stream_url": "https://...",
  "format": {
    "protocol": "hls",
    "mime_type": "audio/mpeg"
  }
}
```

**Status Codes:**
- **200** - Success
- **404** - Track not found or not streamable
- **500** - Failed to fetch stream

**Note:** Stream URLs are time-limited and should be used immediately.

---

### Playlists & Albums

#### `GET /api/soundcloud/playlists`

Fetches playlists for a user.

**Query Parameters:**
- `userId` (required) - SoundCloud user ID
- `limit` (optional) - Number of playlists (default: 200)

**Response:**
```json
{
  "collection": [
    {
      "id": 345678,
      "title": "Playlist Title",
      "track_count": 10,
      "duration": 600000,
      "is_album": false,
      ...
    }
  ]
}
```

**Caching:**
- TTL: 15 minutes
- Type: `playlists`

---

#### `GET /api/soundcloud/albums`

Fetches albums for a user.

**Query Parameters:**
- `userId` (required) - SoundCloud user ID
- `limit` (optional) - Number of albums (default: 200)

**Response:**
Similar to playlists, but with `is_album: true`

---

#### `GET /api/soundcloud/playlist-tracks`

Fetches tracks for a specific playlist.

**Query Parameters:**
- `playlistId` (required) - Playlist ID

**Response:**
```json
{
  "id": 345678,
  "title": "Playlist Title",
  "tracks": [
    { ... track objects ... }
  ]
}
```

---

### Social Data

#### `GET /api/soundcloud/followers`

Fetches followers for a user.

**Query Parameters:**
- `userId` (required) - SoundCloud user ID
- `limit` (optional) - Number of followers (default: 200)
- `nextHref` (optional) - Pagination URL

**Response:**
```json
{
  "collection": [
    {
      "id": 999888,
      "username": "follower",
      "followers_count": 500,
      ...
    }
  ],
  "next_href": "https://api-v2.soundcloud.com/users/..."
}
```

**Caching:**
- TTL: 60 minutes
- Type: `followers`

---

### Search

#### `GET /api/soundcloud/search`

Search for users, tracks, and playlists.

**Query Parameters:**
- `query` (required) - Search query
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset (default: 0)
- `filter` (optional) - Filter by type: `users`, `tracks`, `playlists`, `albums`

**Response:**
```json
{
  "collection": [
    { ... mixed user/track/playlist objects ... }
  ],
  "total_results": 100,
  "next_href": "https://..."
}
```

**Caching:**
- TTL: 10 minutes
- Type: `search`

**Example:**
```bash
curl "http://localhost:3000/api/soundcloud/search?query=electronic&filter=tracks&limit=50" \
  -H "Cookie: session=..."
```

---

## Cache Management

#### `GET /api/cache`

Get cache statistics.

**Response:**
```json
{
  "stats": [
    {
      "type": "profile",
      "hit_count": 150,
      "miss_count": 50,
      "last_accessed": 1234567890
    }
  ],
  "entries": 42,
  "totalSize": "2.5 MB"
}
```

---

#### `DELETE /api/cache`

Clear all cache entries.

**Query Parameters:**
- `type` (optional) - Clear specific cache type only

**Response:**
```json
{
  "cleared": 42,
  "message": "Cache cleared successfully"
}
```

**Example:**
```bash
# Clear all cache
curl -X DELETE http://localhost:3000/api/cache

# Clear only profile cache
curl -X DELETE "http://localhost:3000/api/cache?type=profile"
```

---

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error occurred |
| 503 | Service Unavailable | SoundCloud API unavailable |

### Error Examples

**Missing Parameter:**
```json
{
  "error": "Missing 'url' parameter"
}
```

**Authentication Error:**
```json
{
  "error": "Unauthorized"
}
```

**SoundCloud API Error:**
```json
{
  "error": "Failed to fetch SoundCloud profile data",
  "details": "Profile not found"
}
```

---

## Rate Limiting

### SoundCloud API Limits

- Rate limits are enforced by SoundCloud API
- Authenticated requests (OAuth) have higher limits
- Public API requests are more restricted

### Caching Strategy

To minimize API calls and stay within rate limits:

1. **Profile data** - Cached for 30 minutes
2. **Tracks/Playlists** - Cached for 15 minutes
3. **Search results** - Cached for 10 minutes
4. **Followers** - Cached for 60 minutes

### Best Practices

1. **Use caching** - Let the cache layer handle repeated requests
2. **Batch requests** - Use combined endpoints (e.g., `/profile`) when possible
3. **Pagination** - Use `limit` parameters to request only what you need
4. **Error handling** - Implement exponential backoff for rate limit errors

---

## Authentication Modes

SoundGround supports two authentication modes:

### 1. OAuth Mode (Recommended)

**Requirements:**
- `SOUNDCLOUD_CLIENT_ID`
- `SOUNDCLOUD_CLIENT_SECRET`
- `SOUNDCLOUD_REDIRECT_URI`
- `JWT_SECRET`

**Features:**
- Higher rate limits
- Access to authenticated user data
- Session management
- Full API access

### 2. Public API Mode (Development)

**Requirements:**
- `SOUNDCLOUD_CLIENT_ID` only

**Features:**
- Lower rate limits
- Public data only
- No authentication required
- Limited API access

---

## Examples

### Fetch User Profile and Tracks

```javascript
// Fetch complete profile
const response = await fetch(
  '/api/soundcloud/profile?url=https://soundcloud.com/artist'
);
const data = await response.json();

console.log('Profile:', data.profile);
console.log('Tracks:', data.tracks);
console.log('Playlists:', data.playlists);
```

### Search for Tracks

```javascript
const response = await fetch(
  '/api/soundcloud/search?query=electronic&filter=tracks&limit=20'
);
const data = await response.json();

console.log('Results:', data.collection);
```

### Play a Track

```javascript
// Get stream URL
const response = await fetch(`/api/soundcloud/stream/${trackId}`);
const { stream_url, format } = await response.json();

// Use with audio player
const audio = new Audio(stream_url);
audio.play();
```

---

## TypeScript Types

All API responses have TypeScript types available in `/src/types/index.ts`:

```typescript
import type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  ProfileApiResponse,
} from '@/types';
```

---

## Support

For issues or questions:
- GitHub Issues: [soundground/issues](https://github.com/yourusername/soundground/issues)
- SoundCloud API Docs: [developers.soundcloud.com](https://developers.soundcloud.com/)

