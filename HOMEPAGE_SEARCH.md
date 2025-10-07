# CloudMate Homepage Search

## Vision

Transform the CloudMate homepage into a discovery-first experience centered around a powerful search interface that combines real-time SoundCloud search with our own curated database of music metadata.

## User Experience

### Homepage Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [CloudMate Logo]                   │
│                                                 │
│      What do you want to listen to today?       │
│                                                 │
│   ┌───────────────────────────────────────┐    │
│   │  🔍  Search artists, tracks, albums...│    │
│   └───────────────────────────────────────┘    │
│                                                 │
│         [Trending] [Genres] [New Releases]      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Search Flow

1. **Initial State**: Clean, minimal homepage with prominent search bar
2. **As User Types**: Real-time suggestions appear (artists, albums, tracks, labels, genres)
3. **Search Results**: Categorized results showing:
   - Artists
   - Albums & EPs
   - Tracks
   - Playlists
   - Labels
   - Genres/Tags

## Search Architecture

### Dual Search Strategy

#### Phase 1: SoundCloud-First (Current)
- Direct passthrough to SoundCloud search API
- Quick to implement, leverages existing infrastructure
- Limited control over ranking and relevance

#### Phase 2: Hybrid Search (Near-term)
- SoundCloud API for real-time results
- Local database for enhanced metadata and caching
- Merge results with custom ranking algorithm

#### Phase 3: Search Engine (Long-term)
- Primary search from local database
- SoundCloud API as fallback/enrichment
- Full control over relevance, ranking, and features

## Database Schema

### Core Entities

```typescript
// Artists
interface Artist {
  id: string;              // SoundCloud ID
  handle: string;          // Unique handle
  username: string;        // Display name
  verified: boolean;
  followerCount: number;
  trackCount: number;
  avatarUrl: string;
  genres: string[];        // Extracted from tracks/bio
  labels: string[];        // Associated labels
  popularTracks: string[]; // Track IDs
  indexedAt: Date;
  lastUpdatedAt: Date;
}

// Albums & EPs
interface Album {
  id: string;
  artistId: string;
  title: string;
  type: 'album' | 'ep' | 'compilation';
  releaseDate: Date;
  artworkUrl: string;
  trackCount: number;
  tracks: string[];        // Track IDs
  genres: string[];
  label?: string;
  indexedAt: Date;
}

// Tracks
interface Track {
  id: string;
  artistId: string;
  title: string;
  duration: number;
  playCount: number;
  likeCount: number;
  genre?: string;
  tags: string[];
  artworkUrl: string;
  streamUrl: string;
  waveformUrl: string;
  releaseDate?: Date;
  albumId?: string;
  label?: string;
  indexedAt: Date;
}

// Labels
interface Label {
  name: string;            // Primary key
  description?: string;
  artists: string[];       // Artist IDs
  releases: string[];      // Album IDs
  website?: string;
  indexedAt: Date;
}

// Genres/Tags
interface Genre {
  name: string;            // Primary key (normalized)
  displayName: string;     // Original casing
  trackCount: number;
  artistCount: number;
  popularTracks: string[]; // Top tracks in genre
  relatedGenres: string[]; // Similar genres
  indexedAt: Date;
}

// Search Index (for full-text search)
interface SearchIndex {
  entityId: string;
  entityType: 'artist' | 'album' | 'track' | 'label' | 'genre';
  searchableText: string;  // Concatenated searchable fields
  popularity: number;      // Ranking score
  updatedAt: Date;
}
```

### Database Technology Options

1. **SQLite (Current Choice)**
   - ✅ Already using for cache
   - ✅ FTS5 full-text search built-in
   - ✅ Simple deployment (file-based)
   - ⚠️ Limited concurrent writes
   - ⚠️ Manual search ranking

2. **PostgreSQL + pg_trgm**
   - ✅ Powerful full-text search
   - ✅ Better concurrency
   - ✅ JSON support for metadata
   - ❌ More complex deployment
   - ❌ Requires separate service

3. **Meilisearch / Typesense**
   - ✅ Purpose-built for search
   - ✅ Typo tolerance, instant results
   - ✅ Great relevance ranking
   - ❌ Separate service required
   - ❌ More infrastructure

**Recommendation**: Start with SQLite + FTS5, migrate to dedicated search engine (Meilisearch) if needed.

## Implementation Phases

### Phase 1: Basic Search (Week 1-2)

**Goal**: Homepage with SoundCloud search integration

- [ ] New homepage UI with search bar
- [ ] SoundCloud search API endpoint (`/api/soundcloud/search`)
- [ ] Client-side search component with debouncing
- [ ] Basic result categorization (tracks, artists, playlists)
- [ ] Click to navigate to artist profile or play track

**Files to Create/Modify**:
- `src/app/page.tsx` - New homepage
- `src/app/api/soundcloud/search/route.ts` - Search endpoint
- `src/components/search-bar.tsx` - Search input
- `src/components/search-results.tsx` - Results display

### Phase 2: Database Foundation (Week 3-4)

**Goal**: Start building local music database

- [ ] Extend SQLite schema for music entities
- [ ] Background indexing service
- [ ] API endpoints for database queries
- [ ] Admin interface for monitoring index status

**New Database Tables**:
```sql
CREATE TABLE artists (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  track_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  metadata JSON, -- genres, labels, etc.
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  genre TEXT,
  tags JSON,
  artwork_url TEXT,
  stream_url TEXT,
  metadata JSON,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK(type IN ('album', 'ep', 'compilation')),
  release_date DATE,
  artwork_url TEXT,
  track_count INTEGER,
  tracks JSON, -- Array of track IDs
  metadata JSON,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

CREATE TABLE labels (
  name TEXT PRIMARY KEY,
  description TEXT,
  metadata JSON,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genres (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  track_count INTEGER DEFAULT 0,
  artist_count INTEGER DEFAULT 0,
  metadata JSON,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index
CREATE VIRTUAL TABLE search_index USING fts5(
  entity_id,
  entity_type,
  searchable_text,
  popularity,
  content='',
  contentless_delete=1
);
```

**Files to Create**:
- `src/lib/database/schema.sql` - Database schema
- `src/lib/database/models.ts` - TypeScript models
- `src/lib/indexing/artist-indexer.ts` - Index artists
- `src/lib/indexing/track-indexer.ts` - Index tracks
- `src/lib/indexing/queue.ts` - Indexing queue management

### Phase 3: Hybrid Search (Week 5-6)

**Goal**: Combine SoundCloud + local database

- [ ] FTS5 search implementation
- [ ] Result merging algorithm
- [ ] Relevance scoring
- [ ] Search analytics (track what people search for)

**Search Logic**:
```typescript
async function hybridSearch(query: string) {
  // 1. Search local database (fast)
  const localResults = await searchLocalDatabase(query);
  
  // 2. Search SoundCloud API (slower)
  const soundcloudResults = await searchSoundCloud(query);
  
  // 3. Merge and deduplicate
  const merged = mergeResults(localResults, soundcloudResults);
  
  // 4. Rank by relevance
  const ranked = rankByRelevance(merged, query);
  
  // 5. Return top results
  return ranked.slice(0, 50);
}
```

### Phase 4: Enhanced Features (Week 7-8)

**Goal**: Advanced search capabilities

- [ ] Filter by genre, date, popularity
- [ ] "Similar artists" suggestions
- [ ] Trending searches
- [ ] Search history (authenticated users)
- [ ] Auto-complete with smart suggestions

### Phase 5: Full Search Engine (Month 3+)

**Goal**: Primary search from local database

- [ ] Comprehensive indexing pipeline
- [ ] Scheduled re-indexing (weekly/daily)
- [ ] Search quality metrics
- [ ] A/B testing for ranking algorithms
- [ ] Consider migration to Meilisearch if scale requires

## Data Collection Strategy

### Seed Data Sources

1. **Popular Artists** (High Priority)
   - Top 1000 SoundCloud artists by followers
   - Verified artists
   - Artists from popular playlists

2. **Genre Tags** (Medium Priority)
   - Extract from track metadata
   - Normalize variations (e.g., "Hip-Hop", "hip hop", "hiphop")
   - Build genre taxonomy

3. **Labels** (Low Priority)
   - Extract from track descriptions
   - User-submitted corrections
   - Official label accounts

### Indexing Strategy

```typescript
// Incremental indexing approach
interface IndexingStrategy {
  // Initial: Index on first view
  onDemand: boolean;
  
  // Keep popular content fresh
  refreshPopular: {
    enabled: boolean;
    threshold: number; // followers/plays
    interval: string;  // e.g., "24h"
  };
  
  // Periodic full re-index
  fullReindex: {
    enabled: boolean;
    schedule: string;  // cron format
  };
  
  // Index related content
  cascading: {
    enabled: boolean;
    depth: number;     // how many levels
  };
}
```

**Example Flow**:
1. User searches "lo-fi hip hop"
2. Results come from SoundCloud API
3. Background job indexes top 50 results
4. Next search returns instant results from database
5. Weekly job refreshes popular content

## Technical Considerations

### Performance

- **Search Latency Target**: < 100ms for local, < 500ms for hybrid
- **Indexing Rate**: 1000 entities/minute
- **Database Size**: ~100MB per 10,000 indexed entities
- **Cache Strategy**: Redis for hot search queries

### Search Ranking Factors

```typescript
interface RankingFactors {
  textRelevance: number;    // How well query matches text (40%)
  popularity: number;       // Followers/plays/likes (30%)
  freshness: number;        // Recent activity (10%)
  completeness: number;     // Profile completeness (10%)
  userPreference: number;   // User listening history (10%)
}
```

### Privacy & Legal

- [ ] Review SoundCloud Terms of Service for data storage
- [ ] Implement data retention policy
- [ ] GDPR considerations for EU users
- [ ] Attribution requirements for indexed content

## Success Metrics

1. **Search Usage**
   - % of homepage visits that perform search
   - Average searches per session

2. **Search Quality**
   - Click-through rate on top result
   - Time to successful result
   - Refinement rate (users re-searching)

3. **Database Growth**
   - Entities indexed per week
   - Coverage of popular content
   - Index freshness

4. **Performance**
   - Search latency (p50, p95, p99)
   - Database query time
   - Page load time

## Open Questions

1. **Should we index all content or just popular content?**
   - Start with popular, expand based on demand

2. **How often to refresh indexed data?**
   - Popular artists: Daily
   - Regular artists: Weekly
   - Rare content: On-demand

3. **How to handle deleted/private content?**
   - Webhook from SoundCloud? (if available)
   - Periodic validation checks
   - Remove from index after 404s

4. **Should we allow users to submit corrections?**
   - Genre classifications
   - Label affiliations
   - Artist relationships

## Next Steps

1. **Immediate** (This Week)
   - Design new homepage mockups
   - Implement basic search bar UI
   - Create SoundCloud search API endpoint

2. **Short-term** (Next 2 Weeks)
   - Extend database schema
   - Build indexing service MVP
   - Test hybrid search approach

3. **Medium-term** (Next Month)
   - Launch homepage search to production
   - Start background indexing
   - Monitor search quality metrics

4. **Long-term** (Quarter)
   - Scale database to 100k+ entities
   - Advanced search features
   - Consider dedicated search engine

---

**Document Version**: 1.0  
**Last Updated**: October 7, 2025  
**Status**: Planning Phase

