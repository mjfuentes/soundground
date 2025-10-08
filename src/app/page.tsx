"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

export default function Home() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthMode, setOauthMode] = useState(false);
  const [searchResults, setSearchResults] = useState<(SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if OAuth is configured by trying to fetch user info
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          // OAuth not configured or not logged in
          setOauthMode(false);
          setLoading(false);
          return null;
        }
        if (res.ok) {
          setOauthMode(true);
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        setOauthMode(false);
        setLoading(false);
      });
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery("");
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
          <span className="text-zinc-300">Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header with auth info */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">SoundClopedia</h1>
          {oauthMode && user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                Signed in as <span className="font-medium text-amber-500">@{user.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero section with search */}
        <div className={`text-center transition-all duration-300 ${searchResults.length > 0 ? 'mb-8' : 'mt-20 mb-12'}`}>
          <h2 className="text-4xl font-semibold sm:text-5xl mb-4">
            What do you want to listen to today?
          </h2>
          <p className="text-lg text-zinc-300 sm:text-xl mb-8">
            Search for artists, tracks, albums, playlists, and more
          </p>
          
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Search results */}
        <SearchResults 
          results={searchResults} 
          isLoading={isSearching}
          query={searchQuery}
        />

        {/* Quick links or suggestions when no search */}
        {!searchQuery && (
          <div className="max-w-4xl mx-auto mt-16">
            <div className="text-center text-zinc-500">
              <p className="text-sm">Try searching for your favorite artists, tracks, or genres</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
