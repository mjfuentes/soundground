"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [value, setValue] = useState("");
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const query = value.trim();
    router.push(`/${encodeURIComponent(query)}`);
  };

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
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <h1 className="text-5xl font-semibold sm:text-6xl">Cloudmate</h1>
            {oauthMode && user && (
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
              >
                Logout
              </button>
            )}
          </div>
          {oauthMode && user && (
            <p className="mb-2 text-sm text-zinc-400">
              Signed in as <span className="text-amber-500">@{user.username}</span>
            </p>
          )}
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
            Enter a SoundCloud artist handle
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="artist-handle"
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-white placeholder-zinc-400 transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-8 py-3 font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
            disabled={!value.trim()}
          >
            Go
          </button>
        </form>
      </div>
    </main>
  );
}
