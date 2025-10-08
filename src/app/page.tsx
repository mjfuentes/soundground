"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthMode, setOauthMode] = useState(false);
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
        {/* Hero section */}
        <div className="text-center mt-20 mb-12">
          <h2 className="text-4xl font-semibold sm:text-5xl mb-4">
            What do you want to listen to today?
          </h2>
          <p className="text-lg text-zinc-300 sm:text-xl">
            Search for artists, tracks, albums, playlists, and more
          </p>
        </div>

        {/* Quick links or suggestions */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="text-center text-zinc-500">
            <p className="text-sm">Try searching for your favorite artists, tracks, or genres using the search bar above</p>
          </div>
        </div>
      </div>
    </main>
  );
}
