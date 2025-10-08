"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import Image from "next/image";
import { setProfilePreview } from "@/lib/profile-preview";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface SearchDropdownProps {
  results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[];
  isLoading: boolean;
  query: string;
  onClose: () => void;
  selectedIndex?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
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

// Helper function to check if an item has an image
function hasImage(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): boolean {
  if (isUser(result)) {
    return !!result.avatar_url;
  }
  return !!result.artwork_url;
}

// Quality filter: Remove low-quality results that clutter search
function isQualityResult(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): boolean {
  if (isUser(result)) {
    // Artists: Must have either
    // 1. Avatar AND at least 1 follower, OR
    // 2. At least 10 followers, OR  
    // 3. At least 1 track
    const hasAvatar = !!result.avatar_url;
    const hasMinFollowers = (result.followers_count || 0) >= 10;
    const hasTracks = (result.track_count || 0) >= 1;
    
    // Reject if no avatar, no tracks, and very few followers
    if (!hasAvatar && !hasTracks && (result.followers_count || 0) < 10) {
      return false;
    }
    
    return hasAvatar || hasMinFollowers || hasTracks;
  } else if (isTrack(result)) {
    // Tracks: Must have artwork OR significant playback count (1000+)
    const hasArtwork = !!result.artwork_url;
    const hasSignificantPlays = (result.playback_count || 0) >= 1000;
    
    return hasArtwork || hasSignificantPlays;
  } else if (isPlaylist(result)) {
    // Playlists: Must have artwork OR at least 3 tracks
    const hasArtwork = !!result.artwork_url;
    const hasMinTracks = (result.track_count || 0) >= 3;
    
    return hasArtwork || hasMinTracks;
  }
  
  return true;
}

// Sort results: Artists first, then by image availability, then by relevance metrics
function sortSearchResults(results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]) {
  return [...results].sort((a, b) => {
    // Priority 1: Artists (users) come first
    const aIsUser = isUser(a);
    const bIsUser = isUser(b);
    if (aIsUser && !bIsUser) return -1;
    if (!aIsUser && bIsUser) return 1;

    // Priority 2: Items with images come before items without
    const aHasImage = hasImage(a);
    const bHasImage = hasImage(b);
    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;

    // Priority 3: Within same type, sort by engagement/popularity
    if (isUser(a) && isUser(b)) {
      // Sort artists by follower count
      return (b.followers_count || 0) - (a.followers_count || 0);
    } else if (isTrack(a) && isTrack(b)) {
      // Sort tracks by playback count
      return (b.playback_count || 0) - (a.playback_count || 0);
    } else if (isPlaylist(a) && isPlaylist(b)) {
      // Sort playlists by likes count
      return (b.likes_count || 0) - (a.likes_count || 0);
    }

    // Priority 4: Tracks before playlists if different types
    const aIsTrack = isTrack(a);
    const bIsTrack = isTrack(b);
    if (aIsTrack && !bIsTrack) return -1;
    if (!aIsTrack && bIsTrack) return 1;

    return 0;
  });
}

const MAX_RESULTS = 5;

export function SearchDropdown({ results, isLoading, query, onClose, selectedIndex = 0, containerRef }: SearchDropdownProps) {
  const router = useRouter();

  // Filter out low-quality results first, then sort, then limit to MAX_RESULTS
  const qualityResults = results.filter(isQualityResult);
  const sortedResults = sortSearchResults(qualityResults).slice(0, MAX_RESULTS);

  const handleResultClick = useCallback((result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist) => {
    if (isUser(result)) {
      // Store preview data for instant loading
      setProfilePreview({
        username: result.username || '',
        avatar: result.avatar_url || '',
        followers: result.followers_count || 0,
        handle: result.permalink,
      });
      // Navigate to clean URL
      router.push(`/${result.permalink}`);
      onClose();
    } else if (isTrack(result)) {
      // Navigate to track page
      router.push(`/track/${result.id}`);
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
  }, [router, onClose]);

  // Listen for keyboard navigation events
  useEffect(() => {
    if (!query && !isLoading) return;
    
    const handleNavigateSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number }>;
      const result = sortedResults[customEvent.detail.index];
      if (result) {
        handleResultClick(result);
      }
    };

    const container = containerRef?.current;
    container?.addEventListener('navigate-selected', handleNavigateSelected);
    return () => {
      container?.removeEventListener('navigate-selected', handleNavigateSelected);
    };
  }, [sortedResults, containerRef, handleResultClick, query, isLoading]);

  if (!query) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-md border border-zinc-800 rounded-md shadow-xl overflow-hidden z-50">
      {sortedResults.length === 0 && !isLoading ? (
        <div className="py-8 text-center">
          <p className="text-xs text-zinc-500">No results</p>
        </div>
      ) : (
        <div className="py-1">
          {/* Pad results to always show MAX_RESULTS items */}
          {Array.from({ length: MAX_RESULTS }).map((_, index) => {
            const result = sortedResults[index];
            
            if (!result) {
              // Empty placeholder to maintain fixed height
              return <div key={`empty-${index}`} className="h-14"></div>;
            }

            if (isUser(result)) {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-3 py-2 transition-colors flex items-center gap-3 text-left cursor-pointer ${
                    isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800/30">
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
                    <div className="text-sm font-medium text-white truncate">{result.username}</div>
                    <div className="text-xs text-zinc-500">{result.followers_count?.toLocaleString() || 0} followers</div>
                  </div>
                </button>
              );
            } else if (isTrack(result)) {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-3 py-2 transition-colors flex items-center gap-3 text-left cursor-pointer ${
                    isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-zinc-800/30">
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
                    <div className="text-sm font-medium text-white truncate">{result.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{result.user?.username || 'Unknown'}</div>
                  </div>
                </button>
              );
            } else if (isPlaylist(result)) {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-3 py-2 transition-colors flex items-center gap-3 text-left cursor-pointer ${
                    isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-zinc-800/30">
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
                    <div className="text-sm font-medium text-white truncate">{result.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{result.user?.username || 'Unknown'}</div>
                  </div>
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

