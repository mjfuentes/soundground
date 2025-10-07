# Changelog

All notable changes to CloudMate will be documented in this file.

## [Unreleased] - 2025-10-07

### Added
- **Comprehensive Streaming & Engagement Metrics**
  - Track-level metrics: plays, likes, reposts, comments
  - Album/playlist metrics: plays, likes, reposts, track count
  - Profile-wide aggregate statistics card
  - Most popular track highlighting
  
- **New Components**
  - `TrackCard`: Rich track display with album art and all engagement metrics
  - `AlbumCard`: Enhanced album/playlist cards with statistics
  - `ProfileStats`: Aggregate statistics overview component
  
- **New API Endpoint**
  - `GET /api/soundcloud/tracks`: Dedicated endpoint for fetching tracks by user ID with full metrics
  
- **Enhanced Data Interfaces**
  - Extended `SoundCloudTrack` interface with `reposts_count`, `comment_count`, and `created_at`
  - Extended `SoundCloudPlaylist` interface with `reposts_count`, `playback_count`, and `created_at`

### Changed
- Updated profile API route to fetch up to 50 recent tracks with metrics
- Enhanced profile view to display "Recent Tracks" section with top 10 tracks
- Replaced simple playlist/album links with rich `AlbumCard` components
- Added stats overview card to profile sidebar (displays when data available)

### Documentation
- Added `STREAMING_METRICS.md` with comprehensive guide to all metrics
- Updated `README.md` with new features section
- Added new documentation section linking to all guides

### Testing
- Added comprehensive tests for new tracks API endpoint
- Updated existing profile tests to cover new functionality
- All 50 tests passing

### Performance
- Limited tracks fetch to 50 items per profile for optimal performance
- All API calls still parallelized using `Promise.all()`
- Metrics cached with existing 5-minute TTL

## Previous Versions

See git history for changes prior to this release.

