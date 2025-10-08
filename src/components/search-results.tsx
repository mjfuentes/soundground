"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface SearchResultsProps {
  results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  isLoading?: boolean;
  query: string;
}

// Type guards
function isUser(item: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): item is SoundCloudUser {
  return 'permalink' in item && 'followers_count' in item;
}

function isTrack(item: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): item is SoundCloudTrack {
  return 'duration' in item && 'user' in item && !('track_count' in item);
}

function isPlaylist(item: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): item is SoundCloudPlaylist {
  return 'track_count' in item && 'is_album' in item;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="text-center text-zinc-400">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"></div>
          <p className="mt-4">Searching...</p>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    if (!query) return null;
    
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="text-center text-zinc-400">
          <p>No results found for &quot;{query}&quot;</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </div>
      </div>
    );
  }

  // Categorize results
  const artists = results.filter(isUser);
  const tracks = results.filter(isTrack);
  const playlists = results.filter(isPlaylist).filter(p => !p.is_album);
  const albums = results.filter(isPlaylist).filter(p => p.is_album);

  const handleArtistClick = (artist: SoundCloudUser) => {
    router.push(`/${artist.permalink}`);
  };

  const handleTrackClick = (track: SoundCloudTrack) => {
    router.push(`/track/${track.id}`);
  };

  const handlePlaylistClick = (playlist: SoundCloudPlaylist) => {
    window.open(playlist.permalink_url, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
      {/* Artists */}
      {artists.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Artists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {artists.slice(0, 6).map((artist) => (
              <button
                key={artist.id}
                onClick={() => handleArtistClick(artist)}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:border-amber-500 hover:bg-white/10 transition-all duration-200 text-left"
              >
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={artist.avatar_url || '/placeholder-avatar.png'}
                    alt={artist.username}
                    fill
                    className="rounded-full object-cover"
                    unoptimized
                  />
                  {artist.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{artist.username}</h3>
                  <p className="text-sm text-zinc-400">
                    {artist.followers_count.toLocaleString()} followers • {artist.track_count} tracks
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tracks */}
      {tracks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Tracks</h2>
          <div className="space-y-2">
            {tracks.slice(0, 8).map((track) => (
              <button
                key={track.id}
                onClick={() => handleTrackClick(track)}
                className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-amber-500 hover:bg-white/10 transition-all duration-200 w-full text-left"
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={track.artwork_url || '/placeholder-track.png'}
                    alt={track.title}
                    fill
                    className="rounded object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <p className="text-sm text-zinc-400 truncate">{track.user.username}</p>
                </div>
                {track.playback_count && (
                  <div className="text-sm text-zinc-500">
                    {track.playback_count.toLocaleString()} plays
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Albums & EPs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {albums.slice(0, 8).map((album) => (
              <button
                key={album.id}
                onClick={() => handlePlaylistClick(album)}
                className="group text-left"
              >
                <div className="relative aspect-square mb-2">
                  <Image
                    src={album.artwork_url || '/placeholder-album.png'}
                    alt={album.title}
                    fill
                    className="rounded-lg object-cover group-hover:opacity-80 transition-opacity"
                    unoptimized
                  />
                </div>
                <h3 className="font-medium text-sm truncate group-hover:text-amber-400 transition-colors">
                  {album.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate">{album.user.username}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Playlists */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Playlists</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {playlists.slice(0, 8).map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handlePlaylistClick(playlist)}
                className="group text-left"
              >
                <div className="relative aspect-square mb-2">
                  <Image
                    src={playlist.artwork_url || '/placeholder-playlist.png'}
                    alt={playlist.title}
                    fill
                    className="rounded-lg object-cover group-hover:opacity-80 transition-opacity"
                    unoptimized
                  />
                </div>
                <h3 className="font-medium text-sm truncate group-hover:text-amber-400 transition-colors">
                  {playlist.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {playlist.track_count} tracks • {playlist.user.username}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

