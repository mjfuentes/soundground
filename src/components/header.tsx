"use client";

import { useRouter, usePathname } from "next/navigation";
import { SearchBar } from "./search-bar";
import { SearchDropdown } from "./search-dropdown";
import { ClientSearchCache } from "@/lib/client-search-cache";
import { setProfilePreview } from "@/lib/profile-preview";
import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchResults, setSearchResults] = useState<(SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<{ blur: () => void }>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

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
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
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

  // Logo click/long-press handlers
  const handleLogoMouseDown = useCallback(() => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
    }, 500); // 500ms for long press
  }, []);

  const handleLogoMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPress) {
      // Long press - go to home
      router.push('/');
    } else if (pathname !== '/') {
      // Click - go back
      router.back();
    }
    setIsLongPress(false);
  }, [isLongPress, pathname, router]);

  const handleLogoTouchStart = useCallback(() => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
    }, 500);
  }, []);

  const handleLogoTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    e.preventDefault();
    if (isLongPress) {
      router.push('/');
    } else if (pathname !== '/') {
      router.back();
    }
    setIsLongPress(false);
  }, [isLongPress, pathname, router]);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={handleLogoClick}
            onMouseDown={handleLogoMouseDown}
            onMouseUp={handleLogoMouseUp}
            onMouseLeave={handleLogoMouseUp}
            onTouchStart={handleLogoTouchStart}
            onTouchEnd={handleLogoTouchEnd}
            className="flex items-center justify-center hover:text-white text-neutral-400 transition flex-shrink-0 cursor-pointer p-1"
            aria-label={pathname === '/' ? 'Home' : 'Back (hold for home)'}
            title={pathname === '/' ? 'Home' : 'Click: Back | Hold: Home'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-full max-w-2xl relative" ref={containerRef}>
            <SearchBar 
              ref={searchBarRef}
              onSearch={handleSearch}
              onKeyDown={handleKeyDown}
              value={searchQuery}
              hasResults={searchResults.length > 0 && isDropdownOpen}
            />
            {isDropdownOpen && (
              <SearchDropdown
                results={searchResults}
                isLoading={isSearching}
                query={searchQuery}
                onClose={handleCloseDropdown}
                selectedIndex={selectedIndex}
                isMobile={false}
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <div className="flex items-center justify-center text-neutral-400 flex-shrink-0 p-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <div className="w-full max-w-2xl">
              <div className="w-full py-2.5 px-3 sm:px-4 border border-zinc-700 rounded-md"></div>
            </div>
          </div>
        </div>
      </header>
    }>
      <HeaderSearch />
    </Suspense>
  );
}

