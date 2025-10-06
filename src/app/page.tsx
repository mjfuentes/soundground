"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const query = value.trim();
    router.push(`/${encodeURIComponent(query)}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6">
        <div className="text-center">
          <h1 className="text-5xl font-semibold sm:text-6xl">Cloudmate</h1>
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
        <div className="text-center">
          <Link
            href="/signin"
            className="text-sm text-purple-400 transition hover:text-purple-300 hover:underline"
          >
            Link multiple platforms (SoundCloud + RA.co)
          </Link>
        </div>
      </div>
    </main>
  );
}
