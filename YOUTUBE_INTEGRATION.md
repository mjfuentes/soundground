# YouTube Integration for SoundClopedia

## 📋 Overview

Integrate YouTube video discovery into SoundClopedia to enhance artist profiles with relevant music videos, live performances, interviews, and other visual content. This integration will provide a richer media experience alongside SoundCloud audio content.

## 🎯 Goals

1. **Search Enhancement**: Search YouTube for artist-related content when viewing profiles
2. **Content Caching**: Cache YouTube search results and metadata to reduce API calls
3. **Vector Search**: Eventually implement semantic search across cached YouTube content
4. **UI Integration**: Seamlessly display YouTube videos on artist pages alongside SoundCloud content

## 📊 Requirements

### API Requirements

#### YouTube Data API v3
- **Authentication**: API Key (quota: 10,000 units/day free tier)
- **Key Endpoints**:
  - `search.list` - Search for videos (100 units per request)
  - `videos.list` - Get video details (1 unit per request)
  - `channels.list` - Get channel info (1 unit per request)
- **Quota Management**: Implement aggressive caching to stay within limits

#### Rate Limits & Quotas
| Operation | Cost (units) | Daily Limit (free) | Strategy |
|-----------|--------------|-------------------|----------|
| Video Search | 100 | ~100 searches | Cache 7-30 days |
| Video Details | 1 | 10,000 requests | Cache indefinitely |
| Channel Info | 1 | 10,000 requests | Cache indefinitely |

### Environment Variables
```bash
# Development (.env.local)
YOUTUBE_API_KEY=your_api_key_here

# Production (Fly.io secrets)
flyctl secrets set YOUTUBE_API_KEY=your_api_key -a soundclopedia
```

## 🏗️ Architecture

### Phase 1: Basic Integration (MVP)
```
User Request → YouTube Search API → Cache in SQLite → Render in UI
```

**Components**:
- `/src/app/api/youtube/search/route.ts` - Search endpoint
- `/src/app/api/youtube/video/[videoId]/route.ts` - Video details
- `/src/lib/youtube/client.ts` - YouTube API client
- `/src/components/youtube-video-card.tsx` - Video display component
- `/src/components/artist-videos.tsx` - Video section for artist pages

### Phase 2: Advanced Caching
```
Search Request → Check Cache → If miss: YouTube API → Store with embeddings
```

**Enhancements**:
- SQLite schema extension for YouTube data
- Timestamp-based cache invalidation
- Search result deduplication

### Phase 3: Vector Search (Future)
```
User Query → Vector Search → Semantic matching → Ranked Results
```

**Technology Stack**:
- Vector embeddings (OpenAI, Cohere, or local models)
- SQLite with vector extension (sqlite-vss) or separate vector store
- Semantic search across video titles, descriptions, tags

## 📁 Database Schema

### YouTube Videos Table
```sql
CREATE TABLE youtube_videos (
  id TEXT PRIMARY KEY,                    -- YouTube video ID
  artist_handle TEXT NOT NULL,            -- SoundCloud artist handle
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  channel_id TEXT,
  channel_title TEXT,
  published_at TEXT,
  duration TEXT,                          -- ISO 8601 duration
  view_count INTEGER,
  like_count INTEGER,
  
  -- Search metadata
  search_query TEXT NOT NULL,             -- Original search query
  search_rank INTEGER,                    -- Position in search results
  relevance_score REAL,                   -- Custom relevance calculation
  
  -- Caching
  cached_at TEXT NOT NULL,                -- ISO timestamp
  last_accessed_at TEXT,                  -- For LRU eviction
  cache_ttl_days INTEGER DEFAULT 30,      -- Configurable TTL
  
  -- Future: Vector embeddings
  embedding_vector BLOB,                  -- Store as binary blob
  embedding_model TEXT,                   -- Track which model was used
  
  FOREIGN KEY (artist_handle) REFERENCES cache (key)
);

CREATE INDEX idx_youtube_artist ON youtube_videos(artist_handle);
CREATE INDEX idx_youtube_cached_at ON youtube_videos(cached_at);
CREATE INDEX idx_youtube_search_query ON youtube_videos(search_query);
```

### Search Queries Table (Analytics)
```sql
CREATE TABLE youtube_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_handle TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER,
  api_call_made BOOLEAN,                  -- True if hit YouTube API
  cached BOOLEAN,                         -- True if served from cache
  timestamp TEXT NOT NULL
);
```

## 🔧 Implementation Plan

### Step 1: API Client Setup
**File**: `/src/lib/youtube/client.ts`

```typescript
import { z } from 'zod';

// Schemas
const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnailUrl: z.string().url(),
  channelId: z.string(),
  channelTitle: z.string(),
  publishedAt: z.string(),
  duration: z.string().optional(),
  viewCount: z.number().optional(),
  likeCount: z.number().optional(),
});

export type YouTubeVideo = z.infer<typeof VideoSchema>;

// Client class
export class YouTubeClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchVideos(query: string, maxResults = 10): Promise<YouTubeVideo[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`);
    if (!response.ok) throw new Error('YouTube API error');

    const data = await response.json();
    return data.items.map(this.mapToVideo);
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideo> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/videos?${params}`);
    if (!response.ok) throw new Error('YouTube API error');

    const data = await response.json();
    return this.mapToVideo(data.items[0]);
  }

  private mapToVideo(item: any): YouTubeVideo {
    return {
      id: item.id.videoId || item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails?.duration,
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
    };
  }
}
```

### Step 2: Cached YouTube Client
**File**: `/src/lib/youtube/cached-client.ts`

```typescript
import { CacheService } from '@/lib/cache/service';
import { YouTubeClient, YouTubeVideo } from './client';

export class CachedYouTubeClient {
  private client: YouTubeClient;
  private cache: CacheService;

  constructor(apiKey: string, cache: CacheService) {
    this.client = new YouTubeClient(apiKey);
    this.cache = cache;
  }

  async searchArtistVideos(
    artistHandle: string,
    artistName: string,
    maxResults = 10
  ): Promise<YouTubeVideo[]> {
    const cacheKey = `youtube:search:${artistHandle}`;
    
    // Check cache first
    const cached = await this.cache.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      console.log(`[YouTube Cache HIT] ${artistHandle}`);
      return cached;
    }

    // Build search query
    const query = `${artistName} music OR live performance OR interview`;
    
    // Fetch from API
    console.log(`[YouTube API Call] Searching: ${query}`);
    const videos = await this.client.searchVideos(query, maxResults);

    // Cache results (30 days TTL)
    await this.cache.set(cacheKey, videos, { ttl: 30 * 24 * 60 * 60 });

    return videos;
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideo> {
    const cacheKey = `youtube:video:${videoId}`;
    
    const cached = await this.cache.get<YouTubeVideo>(cacheKey);
    if (cached) return cached;

    const video = await this.client.getVideoDetails(videoId);
    
    // Cache video details (indefinite - they rarely change)
    await this.cache.set(cacheKey, video, { ttl: 365 * 24 * 60 * 60 });

    return video;
  }
}
```

### Step 3: API Routes
**File**: `/src/app/api/youtube/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CachedYouTubeClient } from '@/lib/youtube/cached-client';
import { CacheService } from '@/lib/cache/service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artistHandle = searchParams.get('handle');
  const artistName = searchParams.get('name');
  const maxResults = parseInt(searchParams.get('maxResults') || '10');

  if (!artistHandle || !artistName) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const cache = new CacheService();
    const client = new CachedYouTubeClient(apiKey, cache);

    const videos = await client.searchArtistVideos(
      artistHandle,
      artistName,
      maxResults
    );

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[YouTube Search Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube videos' },
      { status: 500 }
    );
  }
}
```

### Step 4: UI Components
**File**: `/src/components/youtube-video-card.tsx`

```typescript
'use client';

import Image from 'next/image';
import { YouTubeVideo } from '@/lib/youtube/client';

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
}

export function YouTubeVideoCard({ video }: YouTubeVideoCardProps) {
  const formatViews = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg overflow-hidden bg-neutral-900 hover:bg-neutral-800 transition-colors"
    >
      <div className="relative aspect-video">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <svg className="w-16 h-16 text-white/90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-2 mb-1">
          {video.title}
        </h3>
        <p className="text-sm text-neutral-400">{video.channelTitle}</p>
        {video.viewCount && (
          <p className="text-xs text-neutral-500 mt-1">
            {formatViews(video.viewCount)} views
          </p>
        )}
      </div>
    </a>
  );
}
```

**File**: `/src/components/artist-videos.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { YouTubeVideo } from '@/lib/youtube/client';
import { YouTubeVideoCard } from './youtube-video-card';

interface ArtistVideosProps {
  artistHandle: string;
  artistName: string;
}

export function ArtistVideos({ artistHandle, artistName }: ArtistVideosProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch(
          `/api/youtube/search?handle=${artistHandle}&name=${encodeURIComponent(artistName)}&maxResults=6`
        );
        
        if (!response.ok) throw new Error('Failed to fetch videos');
        
        const data = await response.json();
        setVideos(data.videos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [artistHandle, artistName]);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-neutral-800 aspect-video rounded-lg mb-2" />
              <div className="bg-neutral-800 h-4 rounded w-3/4 mb-1" />
              <div className="bg-neutral-800 h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return null; // Silently fail - videos are optional
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <YouTubeVideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
```

### Step 5: Integration into Artist Page
**File**: `/src/app/[handle]/page.tsx` (add to existing page)

```typescript
import { ArtistVideos } from '@/components/artist-videos';

// Inside the page component, after SoundCloud content:
<ArtistVideos artistHandle={handle} artistName={profile.name} />
```

## 📈 Optimization Strategies

### 1. Smart Caching
```typescript
// Cache with different TTLs based on content type
const CACHE_TTL = {
  SEARCH_RESULTS: 30 * 24 * 60 * 60,    // 30 days
  VIDEO_DETAILS: 365 * 24 * 60 * 60,    // 1 year
  CHANNEL_INFO: 7 * 24 * 60 * 60,       // 7 days
};
```

### 2. Query Optimization
- **Batch Requests**: Fetch multiple video details in single API call
- **Incremental Loading**: Load 3-6 videos initially, "Load More" for additional
- **Relevance Filtering**: Filter out unrelated content before caching

### 3. Quota Management
```typescript
// Track daily API usage
interface QuotaTracker {
  date: string;
  unitsUsed: number;
  searchCalls: number;
  detailCalls: number;
}

// Fallback to cache-only mode if quota exceeded
async function searchWithQuotaCheck(query: string) {
  const today = new Date().toISOString().split('T')[0];
  const usage = await getQuotaUsage(today);
  
  if (usage.unitsUsed > 9000) {
    // Only serve from cache
    return getCachedResults(query);
  }
  
  // Proceed with API call
  return performSearch(query);
}
```

## 🔮 Future Enhancements (Phase 3)

### Vector Embeddings
```typescript
// Generate embeddings for video metadata
import { OpenAI } from 'openai';

async function generateVideoEmbedding(video: YouTubeVideo): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const text = `${video.title} ${video.description} ${video.channelTitle}`;
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}
```

### Semantic Search
```sql
-- Using sqlite-vss extension
CREATE VIRTUAL TABLE youtube_embeddings USING vss0(
  video_id TEXT PRIMARY KEY,
  embedding(768)  -- Dimension depends on model
);

-- Search by similarity
SELECT v.*, distance
FROM youtube_videos v
JOIN youtube_embeddings e ON v.id = e.video_id
WHERE vss_search(e.embedding, query_embedding)
ORDER BY distance ASC
LIMIT 10;
```

### Content Analysis
- **Category Detection**: Classify videos (music video, live, interview, tutorial)
- **Sentiment Analysis**: Analyze comments/descriptions for quality signals
- **Trend Detection**: Surface trending videos for artists
- **Cross-Platform Linking**: Link YouTube videos to SoundCloud tracks

## 🧪 Testing Strategy

### Unit Tests
- YouTube client methods
- Cache hit/miss scenarios
- Error handling (API failures, quota exceeded)

### Integration Tests
- Full search flow with real API
- Cache persistence and retrieval
- UI component rendering

### Manual Testing Checklist
- [ ] Search returns relevant videos
- [ ] Cache reduces API calls on repeat visits
- [ ] UI displays videos correctly
- [ ] External links open in new tabs
- [ ] Loading states work properly
- [ ] Error states handled gracefully
- [ ] Mobile responsive layout

## 📊 Success Metrics

### Performance
- Cache hit rate > 80%
- API quota usage < 70% of daily limit
- Video section loads < 1s (cached) or < 3s (API)

### User Engagement
- Click-through rate on video cards
- Time spent on artist pages (with vs without videos)
- User feedback on video relevance

### Cost Efficiency
- Stay within free tier (10,000 units/day)
- Minimize redundant API calls
- Efficient storage usage for cached data

## 🚀 Deployment Checklist

- [ ] Add `YOUTUBE_API_KEY` to `.env.local`
- [ ] Set Fly.io secret: `flyctl secrets set YOUTUBE_API_KEY=xxx`
- [ ] Run database migration for YouTube tables
- [ ] Update `validate-env.js` to check YouTube API key
- [ ] Add YouTube integration to README
- [ ] Test quota management in production
- [ ] Monitor API usage via Google Cloud Console
- [ ] Set up alerts for quota thresholds

## 📚 Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [SQLite Vector Extension](https://github.com/asg017/sqlite-vss)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

---

**Next Steps**: Implement Phase 1 (MVP) → Monitor usage → Iterate based on metrics → Proceed to Phase 2/3

