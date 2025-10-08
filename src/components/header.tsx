"use client";

import Link from "next/link";
import { SearchBar } from "./search-bar";
import { SearchDropdown } from "./search-dropdown";
import { useState, useCallback, useRef, useEffect } from "react";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

export function Header() {
  const [searchResults, setSearchResults] = useState<(SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery("");
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);
    setIsDropdownOpen(true);

    try {
      const response = await fetch(`/api/soundcloud/search?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.collection || []);
      } else {
        console.error("Search failed:", response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

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
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
              SoundGround
            </span>
          </Link>
          <div className="flex-1 max-w-2xl mx-auto relative" ref={containerRef}>
            <SearchBar onSearch={handleSearch} />
            {isDropdownOpen && (
              <SearchDropdown
                results={searchResults}
                isLoading={isSearching}
                query={searchQuery}
                onClose={handleCloseDropdown}
              />
            )}
          </div>
          <div className="flex-shrink-0"></div> {/* Spacer for visual balance */}
        </div>
      </div>
    </header>
  );
}

