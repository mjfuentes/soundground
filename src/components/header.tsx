"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchBar } from "./search-bar";
import { SearchDropdown } from "./search-dropdown";
import { ClientSearchCache } from "@/lib/client-search-cache";
import { setProfilePreview } from "@/lib/profile-preview";
import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

function HeaderSearch() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<(SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<{ blur: () => void }>(null);

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
    setSelectedIndex(0); // Reset selection when search changes

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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = Math.min(prev + 1, searchResults.length - 1);
        console.log('[Header] Arrow Down - selectedIndex:', prev, '->', newIndex);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = Math.max(prev - 1, 0);
        console.log('[Header] Arrow Up - selectedIndex:', prev, '->', newIndex);
        return newIndex;
      });
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      console.log('[Header] Enter pressed - selectedIndex:', selectedIndex, 'total results:', searchResults.length);
      const selectedResult = searchResults[selectedIndex];
      console.log('[Header] Selected result:', selectedResult);
      
      // Check if it's a user/artist (has followers_count and followings_count)
      if ('followers_count' in selectedResult && 'followings_count' in selectedResult) {
        // It's a user/artist profile
        const handle = selectedResult.permalink || selectedResult.permalink_url?.split('/').pop();
        if (handle) {
          console.log('[Header] Navigating to artist:', handle);
          // Store preview data for instant loading
          setProfilePreview({
            username: selectedResult.username || '',
            avatar: selectedResult.avatar_url || '',
            followers: selectedResult.followers_count || 0,
            handle: handle,
          });
          // Clear search state
          setSearchQuery("");
          setSearchResults([]);
          setIsDropdownOpen(false);
          setSelectedIndex(0);
          // Navigate to artist profile
          router.push(`/${handle}`);
        }
      } else if ('user' in selectedResult && !('is_album' in selectedResult)) {
        // It's a track
        console.log('[Header] Navigating to track:', selectedResult.id);
        // Clear search state
        setSearchQuery("");
        setSearchResults([]);
        setIsDropdownOpen(false);
        setSelectedIndex(0);
        // Navigate to track page
        router.push(`/track/${selectedResult.id}`);
      } else if ('is_album' in selectedResult) {
        // It's a playlist/album - navigate to the artist who owns it
        const ownerHandle = selectedResult.user?.permalink_url?.split('/').pop();
        if (ownerHandle) {
          console.log('[Header] Navigating to playlist owner:', ownerHandle);
          // Clear search state
          setSearchQuery("");
          setSearchResults([]);
          setIsDropdownOpen(false);
          setSelectedIndex(0);
          // Navigate to owner's profile
          router.push(`/${ownerHandle}`);
        }
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

  // Handle Escape key to go back to landing page
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push('/');
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [router]);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0 soundground-logo">
            <svg width="28" height="28" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="white" strokeWidth="2"/>
              <path d="M20 35V25M25 38V22M30 40V20M35 38V22M40 35V25" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-bold text-white">
              SoundGround
            </span>
          </Link>
          <div className="flex-1 max-w-2xl relative" ref={containerRef}>
            <SearchBar 
              ref={searchBarRef}
              onSearch={handleSearch}
              onKeyDown={handleKeyDown}
              value={searchQuery}
            />
            {isDropdownOpen && (
              <SearchDropdown
                results={searchResults}
                isLoading={isSearching}
                query={searchQuery}
                onClose={handleCloseDropdown}
                selectedIndex={selectedIndex}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="28" stroke="white" strokeWidth="2"/>
                <path d="M20 35V25M25 38V22M30 40V20M35 38V22M40 35V25" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <span className="text-xl font-bold text-white">SoundGround</span>
            </Link>
            <div className="flex-1 max-w-2xl">
              <div className="w-full py-2.5 px-4 border border-zinc-700 rounded-md"></div>
            </div>
          </div>
        </div>
      </header>
    }>
      <HeaderSearch />
    </Suspense>
  );
}

