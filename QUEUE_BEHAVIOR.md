# Queue Behavior & Randomization

## Overview
CloudMate implements smart queue management with automatic randomization to create a dynamic listening experience. This document outlines the queue behavior for different user interactions.

## Queue Modes

### 1. Playing an Entire Playlist
**Trigger**: User clicks on a playlist card (header/artwork)

**Behavior**:
- All tracks from the playlist are added to the queue
- **Tracks are shuffled randomly** before adding to queue
- First track from the shuffled queue starts playing immediately
- Remaining shuffled tracks wait in queue

**Example**:
```
Playlist: [Track1, Track2, Track3, Track4, Track5]
Shuffled: [Track3, Track1, Track5, Track2, Track4]
Now Playing: Track3
Queue: [Track1, Track5, Track2, Track4]
```

### 2. Playing a Track from a Playlist
**Trigger**: User clicks on a specific track within a playlist view

**Behavior**:
- Selected track starts playing immediately
- All other tracks from the same playlist are added to queue
- **Other tracks are shuffled randomly** before adding
- Selected track is excluded from the random shuffle

**Example**:
```
Playlist: [Track1, Track2, Track3, Track4, Track5]
User clicks: Track3
Now Playing: Track3
Other tracks shuffled: [Track5, Track1, Track4, Track2]
Queue: [Track5, Track1, Track4, Track2]
```

### 3. Playing a Standalone Track (No Playlist Context)
**Trigger**: User clicks a track that's not part of a visible playlist

**Behavior**:
- Track starts playing immediately
- System attempts to fetch a related playlist or "liked tracks" from the artist
- If found, those tracks are shuffled and added to queue
- If no playlist found, track plays solo (no queue)

**Example**:
```
User clicks: Standalone Track
Now Playing: Standalone Track

Option A (playlist found):
  Fetched: [RelatedTrack1, RelatedTrack2, RelatedTrack3]
  Shuffled: [RelatedTrack2, RelatedTrack3, RelatedTrack1]
  Queue: [RelatedTrack2, RelatedTrack3, RelatedTrack1]

Option B (no playlist):
  Queue: [] (empty)
```

## Auto-play on Queue End
When a track finishes playing:
- Next track from queue starts automatically
- Queue advances (first item removed)
- If queue is empty, playback stops

## Future Enhancements (Settings)
These behaviors will eventually be configurable via user settings:

- **Shuffle Mode**: Toggle randomization on/off
- **Repeat Mode**: Repeat queue, repeat one, or no repeat
- **Auto-fill Queue**: When queue is empty, auto-fetch related tracks
- **Smart Queue**: Learn from listening habits to build better queues

## Implementation Notes

### Queue Storage
- Queue is stored in player context state
- Persists during session (resets on page refresh)
- Future: LocalStorage persistence

### Randomization Algorithm
- Fisher-Yates shuffle algorithm for true randomness
- Ensures no track appears twice in same queue
- Maintains track object integrity (all metadata preserved)

### Performance Considerations
- Playlists with 100+ tracks: Shuffle is instant (O(n) complexity)
- Tracks are lazy-loaded (stream URLs fetched on play, not on queue)
- Queue preview shows next 5 tracks (full queue hidden in UI)

## API Endpoints Used

### Get Playlist Tracks
```
GET /api/soundcloud/playlists?id={playlistId}
```
Returns full playlist with track array for queue building.

### Get Related Tracks (Future)
```
GET /api/soundcloud/related?trackId={trackId}
```
Finds related tracks when no playlist context exists.

## User Experience

### Visual Indicators
- **Now Playing**: Highlighted in purple with play icon
- **Next in Queue**: Subtle indicator showing next track
- **Queue Count**: Badge showing "12 in queue"

### Queue Management UI (Future)
- View full queue in player panel
- Drag to reorder queue
- Remove individual tracks from queue
- Clear entire queue button
- Save queue as playlist

## Testing Scenarios

1. **Empty Playlist**: Show error, don't create queue
2. **Single Track Playlist**: Play track, empty queue
3. **Large Playlist (100+ tracks)**: Verify shuffle performance
4. **Unplayable Tracks**: Skip automatically, move to next in queue
5. **Network Error**: Show error, don't advance queue
6. **User Skips**: Clear current, play next in queue

---

**Last Updated**: October 7, 2025
**Feature Status**: ✅ Implemented
**Version**: 1.0.0

