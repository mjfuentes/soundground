"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { SearchDropdown } from "@/components/search-dropdown";
import { ClientSearchCache } from "@/lib/client-search-cache";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

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

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow keyboard navigation whenever there are results
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.min(searchResults.length, 5) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Navigate directly to selected result
      const selectedResult = searchResults[selectedIndex];
      if (selectedResult) {
        // Check if it's a user/artist
        if ('followers_count' in selectedResult && 'followings_count' in selectedResult) {
          const handle = selectedResult.permalink || selectedResult.permalink_url?.split('/').pop();
          if (handle) {
            router.push(`/${handle}`);
          }
        } else if ('user' in selectedResult && !('is_album' in selectedResult)) {
          // It's a track
          router.push(`/track/${selectedResult.id}`);
        } else if ('is_album' in selectedResult) {
          // It's a playlist
          router.push(`/playlist/${selectedResult.id}`);
        }
        // Close dropdown
        setIsDropdownOpen(false);
      }
    }
  }, [searchResults, selectedIndex, router]);

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
