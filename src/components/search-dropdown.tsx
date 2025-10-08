"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePlayer } from "@/contexts/player-context";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface SearchDropdownProps {
  results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  isLoading: boolean;
  query: string;
  onClose: () => void;
}

function isUser(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudUser {
  return 'followers_count' in result && 'followings_count' in result;
}

function isTrack(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudTrack {
  return 'user' in result && !('is_album' in result);
}

function isPlaylist(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudPlaylist {
  return 'is_album' in result;
}

export function SearchDropdown({ results, isLoading, query, onClose }: SearchDropdownProps) {
  const router = useRouter();
  const { play } = usePlayer();

  if (!query && !isLoading) return null;

  const handleResultClick = (result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist) => {
    if (isUser(result)) {
      router.push(`/${result.permalink}`);
      onClose();
    } else if (isTrack(result)) {
      // Convert SoundCloud track to PlayableItem format
      play({
        id: result.id,
        url: result.permalink_url,
        title: result.title,
        artist: result.user?.username || "Unknown Artist",
        artistUrl: result.user?.permalink_url || "",
        artwork: result.artwork_url,
        description: result.description,
        type: "track"
      });
      onClose();
    } else if (isPlaylist(result)) {
      // Navigate to playlist owner's page for now
      if (result.user?.permalink_url) {
        // Extract permalink from URL
        const permalink = result.user.permalink_url.split('/').pop();
        if (permalink) {
          router.push(`/${permalink}`);
          onClose();
        }
      }
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-50">
      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
            <span className="text-sm text-zinc-400">Searching...</span>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          <p className="text-sm">No results found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="py-2">
          {results.map((result) => {
            if (isUser(result)) {
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800">
                    {result.avatar_url && (
                      <Image
                        src={result.avatar_url}
                        alt={result.username}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{result.username}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{result.followers_count?.toLocaleString() || 0} followers</span>
                      <span>•</span>
                      <span>{result.track_count || 0} tracks</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 uppercase">Artist</div>
                </button>
              );
            } else if (isTrack(result)) {
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                    {result.artwork_url && (
                      <Image
                        src={result.artwork_url}
                        alt={result.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{result.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{result.user?.username || 'Unknown'}</div>
                  </div>
                  <div className="text-xs text-zinc-500 uppercase">Track</div>
                </button>
              );
            } else if (isPlaylist(result)) {
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                    {result.artwork_url && (
                      <Image
                        src={result.artwork_url}
                        alt={result.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{result.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{result.user?.username || 'Unknown'}</div>
                  </div>
                  <div className="text-xs text-zinc-500 uppercase">Playlist</div>
                </button>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

