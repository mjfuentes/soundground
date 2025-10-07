import { PlaylistCard } from "./playlist-card";
import { TrackCard } from "./track-card";
import { getPlaylistWithTracks } from "@/lib/soundcloud/cached-client";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface SpotlightPlaylistProps {
  playlist: SoundCloudPlaylist;
}

export async function SpotlightPlaylist({ playlist }: SpotlightPlaylistProps) {
  // Fetch the full playlist with tracks
  const playlistWithTracks = await getPlaylistWithTracks(playlist.id);
  
  return (
    <div className="flex flex-col gap-2">
      {/* Playlist header card */}
      <PlaylistCard playlist={playlist} showStats={true} />
      
      {/* Playlist tracks */}
      {playlistWithTracks.tracks && playlistWithTracks.tracks.length > 0 && (
        <div className="ml-4 flex flex-col gap-2 border-l-2 border-white/10 pl-4">
          {playlistWithTracks.tracks.map((track) => (
            <TrackCard key={track.id} track={track} showStats={true} />
          ))}
        </div>
      )}
    </div>
  );
}

