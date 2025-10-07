import { PlaylistCard } from "./playlist-card";
import { TrackCard } from "./track-card";
import { getPlaylistWithTracks } from "@/lib/soundcloud/cached-client";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface SpotlightPlaylistProps {
  playlist: SoundCloudPlaylist;
  compact?: boolean;
  coverOnly?: boolean;
}

function isValidTrack(track: unknown): boolean {
  if (!track || typeof track !== 'object') return false;
  const t = track as Record<string, unknown>;
  return !!(
    t.id &&
    t.title &&
    t.permalink_url &&
    typeof t.duration === 'number' &&
    t.duration > 0
  );
}

export async function SpotlightPlaylist({ playlist, compact = false, coverOnly = false }: SpotlightPlaylistProps) {
  // If cover only, just show the playlist card cover
  if (coverOnly) {
    return <PlaylistCard playlist={playlist} showStats={false} coverOnly={true} />;
  }
  
  // If compact, just show the playlist card
  if (compact) {
    return <PlaylistCard playlist={playlist} showStats={false} />;
  }

  // Fetch the full playlist with tracks, with error handling
  let playlistWithTracks = playlist;
  let fetchedFullData = false;
  
  try {
    const fullPlaylist = await getPlaylistWithTracks(playlist.id);
    if (fullPlaylist && fullPlaylist.tracks) {
      playlistWithTracks = fullPlaylist;
      fetchedFullData = true;
    }
  } catch (error) {
    console.error(`Failed to fetch full tracks for playlist ${playlist.id}:`, error);
    // Fall back to filtering what we have
  }
  
  // Filter out invalid tracks (ones without proper data)
  // If we didn't fetch full data, only show the playlist card without tracks
  const validTracks = fetchedFullData 
    ? (playlistWithTracks.tracks?.filter(isValidTrack) || [])
    : [];
  
  return (
    <div className="flex flex-col gap-2">
      {/* Playlist header card */}
      <PlaylistCard playlist={playlist} showStats={true} />
      
      {/* Playlist tracks - only show if we got valid full data */}
      {validTracks.length > 0 && (
        <div className="ml-4 flex flex-col gap-2 border-l-2 border-white/10 pl-4">
          {validTracks.map((track) => (
            <TrackCard key={track.id} track={track} showStats={true} playlistTracks={validTracks} />
          ))}
        </div>
      )}
    </div>
  );
}

