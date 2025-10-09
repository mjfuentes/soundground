"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { SearchDropdown } from "@/components/search-dropdown";
import { ClientSearchCache } from "@/lib/client-search-cache";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

// Import the same filtering/sorting logic used in SearchDropdown
function isUser(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudUser {
  return 'followers_count' in result && 'followings_count' in result;
}

function isTrack(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudTrack {
  return 'user' in result && !('is_album' in result);
}

function isPlaylist(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): result is SoundCloudPlaylist {
  return 'is_album' in result;
}

function hasImage(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): boolean {
  if (isUser(result)) {
    return !!result.avatar_url;
  }
  return !!result.artwork_url;
}

function isQualityResult(result: SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist): boolean {
  if (isUser(result)) {
    const hasAvatar = !!result.avatar_url;
    const hasMinFollowers = (result.followers_count || 0) >= 10;
    const hasTracks = (result.track_count || 0) >= 1;
    
    if (!hasAvatar && !hasTracks && (result.followers_count || 0) < 10) {
      return false;
    }
    
    return hasAvatar || hasMinFollowers || hasTracks;
  } else if (isTrack(result)) {
    const hasArtwork = !!result.artwork_url;
    const hasSignificantPlays = (result.playback_count || 0) >= 1000;
    
    return hasArtwork || hasSignificantPlays;
  } else if (isPlaylist(result)) {
    const hasArtwork = !!result.artwork_url;
    const hasMinTracks = (result.track_count || 0) >= 3;
    
    return hasArtwork || hasMinTracks;
  }
  
  return true;
}

function sortSearchResults(results: (SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]) {
  return [...results].sort((a, b) => {
    const aIsUser = isUser(a);
    const bIsUser = isUser(b);
    if (aIsUser && !bIsUser) return -1;
    if (!aIsUser && bIsUser) return 1;

    const aHasImage = hasImage(a);
    const bHasImage = hasImage(b);
    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;

    if (isUser(a) && isUser(b)) {
      return (b.followers_count || 0) - (a.followers_count || 0);
    } else if (isTrack(a) && isTrack(b)) {
      return (b.playback_count || 0) - (a.playback_count || 0);
    } else if (isPlaylist(a) && isPlaylist(b)) {
      return (b.likes_count || 0) - (a.likes_count || 0);
    }

    const aIsTrack = isTrack(a);
    const bIsTrack = isTrack(b);
    if (aIsTrack && !bIsTrack) return -1;
    if (!aIsTrack && bIsTrack) return 1;

    return 0;
  });
}

const MAX_RESULTS = 5;

export default function Home() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<(SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (query: string, isImmediate = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery("");
      setIsDropdownOpen(false);
      setIsSearching(false);
      setSelectedIndex(0);
      return;
    }

    setSearchQuery(query);
    setIsDropdownOpen(true);
    setSelectedIndex(0);

    // Check cache immediately and show results
    const cachedResults = ClientSearchCache.get(query);
    if (cachedResults) {
      setSearchResults(cachedResults);
    }

    // Don't fetch on immediate calls, wait for debounce
    if (isImmediate) {
      return;
    }

    // Always show loading indicator when fetching fresh results
    setIsSearching(true);

    try {
      const response = await fetch(`/api/soundcloud/search?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const freshResults = data.collection || [];
        
        // Only update UI if results are actually different
        if (!cachedResults || ClientSearchCache.areResultsDifferent(cachedResults, freshResults)) {
          setSearchResults(freshResults);
        }
        
        // Always cache the fresh results
        ClientSearchCache.set(query, freshResults);
      } else {
        console.error("Search failed:", response.statusText);
        if (!cachedResults) {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      if (!cachedResults) {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Apply same filtering and sorting as SearchDropdown to ensure index matches
  const filteredAndSortedResults = useMemo(() => {
    const qualityResults = searchResults.filter(isQualityResult);
    return sortSearchResults(qualityResults).slice(0, MAX_RESULTS);
  }, [searchResults]);

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow keyboard navigation whenever there are results
    if (filteredAndSortedResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredAndSortedResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Navigate to the selected result from the FILTERED AND SORTED array
      const selectedResult = filteredAndSortedResults[selectedIndex];
      if (selectedResult) {
        // Check if it's a user/artist
        if (isUser(selectedResult)) {
          const handle = selectedResult.permalink || selectedResult.permalink_url?.split('/').pop();
          if (handle) {
            router.push(`/${handle}`);
          }
        } else if (isTrack(selectedResult)) {
          // It's a track
          router.push(`/track/${selectedResult.id}`);
        } else if (isPlaylist(selectedResult)) {
          // It's a playlist
          router.push(`/playlist/${selectedResult.id}`);
        }
        // Close dropdown
        setIsDropdownOpen(false);
      }
    }
  }, [filteredAndSortedResults, selectedIndex, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center text-white px-6">
      <div className="w-full max-w-4xl">
        {/* Logo and Search in a row */}
        <div className="flex items-center gap-4 mb-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-2 flex-shrink-0 soundground-logo">
            <svg width="32" height="32" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="white" strokeWidth="2"/>
              <path d="M20 35V25M25 38V22M30 40V20M35 38V22M40 35V25" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <h1 className="text-2xl font-bold text-white whitespace-nowrap">
              SoundGround
            </h1>
          </div>

          {/* Search */}
          <div className="relative flex-1" ref={containerRef}>
            <SearchBar 
              onSearch={handleSearch} 
              isLoading={isSearching} 
              onKeyDown={handleKeyDown}
            />
            {isDropdownOpen && (
              <SearchDropdown
                results={searchResults}
                isLoading={isSearching}
                query={searchQuery}
                onClose={handleCloseDropdown}
                selectedIndex={selectedIndex}
                containerRef={containerRef}
              />
            )}
          </div>
        </div>

        {/* Hint text */}
        <div className="text-center">
          <p className="text-xs text-zinc-500">
            by artists for artists
          </p>
        </div>
      </div>
    </main>
  );
}
