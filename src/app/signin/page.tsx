"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

interface SoundCloudProfile {
  id: number;
  username: string;
  permalink: string;
  avatar_url?: string;
  description?: string;
}

interface RAResult {
  name: string;
  url: string;
  image?: string;
  followers?: number;
}

type Step = "soundcloud" | "ra-search" | "confirmation";

export default function SignInPage() {
  const [step, setStep] = useState<Step>("soundcloud");
  const [soundcloudHandle, setSoundcloudHandle] = useState("");
  const [soundcloudProfile, setSoundcloudProfile] = useState<SoundCloudProfile | null>(null);
  const [raResults, setRaResults] = useState<RAResult[]>([]);
  const [selectedRA, setSelectedRA] = useState<RAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSoundCloudSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!soundcloudHandle.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/soundcloud/profile?url=https://soundcloud.com/${soundcloudHandle.trim()}`
      );

      if (!response.ok) throw new Error("SoundCloud profile not found");

      const data = await response.json();
      setSoundcloudProfile(data.profile);
      
      // Search RA.co
      const raResponse = await fetch(
        `/api/ra/search?query=${encodeURIComponent(data.profile.username)}`
      );
      
      if (raResponse.ok) {
        const raData = await raResponse.json();
        setRaResults(raData.results || []);
      }
      
      setStep("ra-search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRASelect = (ra: RAResult) => {
    setSelectedRA(ra);
    setStep("confirmation");
  };

  const handleConfirm = () => {
    if (!soundcloudProfile || !selectedRA) return;

    const linkedProfile = {
      soundcloud: {
        id: soundcloudProfile.id,
        username: soundcloudProfile.username,
        permalink: soundcloudProfile.permalink,
        avatar_url: soundcloudProfile.avatar_url,
      },
      ra: {
        name: selectedRA.name,
        url: selectedRA.url,
        image: selectedRA.image,
      },
      linkedAt: new Date().toISOString(),
    };

    localStorage.setItem("cloudmate_profile", JSON.stringify(linkedProfile));
    
    window.location.href = `/${soundcloudProfile.permalink}`;
  };

  const handleSkipRA = () => {
    if (!soundcloudProfile) return;

    const linkedProfile = {
      soundcloud: {
        id: soundcloudProfile.id,
        username: soundcloudProfile.username,
        permalink: soundcloudProfile.permalink,
        avatar_url: soundcloudProfile.avatar_url,
      },
      linkedAt: new Date().toISOString(),
    };

    localStorage.setItem("cloudmate_profile", JSON.stringify(linkedProfile));
    
    window.location.href = `/${soundcloudProfile.permalink}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="mx-auto w-full max-w-2xl px-6">
        <div className="mb-8 text-center">
          <Link href="/" className="text-4xl font-semibold hover:text-amber-400 transition">
            Cloudmate
          </Link>
          <p className="mt-3 text-lg text-zinc-400">Link your music profiles</p>
        </div>

        {step === "soundcloud" && (
          <form onSubmit={handleSoundCloudSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="soundcloud" className="text-sm font-medium text-zinc-300">
                SoundCloud Handle
              </label>
              <input
                id="soundcloud"
                type="text"
                value={soundcloudHandle}
                onChange={(e) => setSoundcloudHandle(e.target.value)}
                placeholder="artist-handle"
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!soundcloudHandle.trim() || loading}
              className="rounded-lg bg-amber-500 px-6 py-3 font-medium text-black transition hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Continue"}
            </button>
          </form>
        )}

        {step === "ra-search" && soundcloudProfile && (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-4">
                {soundcloudProfile.avatar_url && (
                  <Image
                    src={soundcloudProfile.avatar_url}
                    alt={soundcloudProfile.username}
                    width={60}
                    height={60}
                    className="rounded-lg"
                  />
                )}
                <div>
                  <p className="text-sm text-zinc-400">SoundCloud</p>
                  <p className="font-medium text-white">{soundcloudProfile.username}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-white">Link RA.co Profile (Optional)</h3>
              
              {raResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {raResults.map((ra, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRASelect(ra)}
                      className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20 hover:bg-white/10"
                    >
                      {ra.image && (
                        <Image
                          src={ra.image}
                          alt={ra.name}
                          width={48}
                          height={48}
                          className="rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white">{ra.name}</p>
                        {ra.followers && (
                          <p className="text-xs text-zinc-400">{ra.followers.toLocaleString()} followers</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-zinc-400">Enter RA.co artist ID:</p>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector('input');
                    const raId = input?.value.trim();
                    if (raId) {
                      const url = `https://ra.co/dj/${raId}`;
                      const name = raId;
                      handleRASelect({ name, url });
                    }
                  }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="artist-id"
                      className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-400"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

              <button
                onClick={handleSkipRA}
                className="mt-2 text-sm text-zinc-400 transition hover:text-white"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === "confirmation" && soundcloudProfile && selectedRA && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-medium text-white">Confirm Linked Profiles</h3>

            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  {soundcloudProfile.avatar_url && (
                    <Image
                      src={soundcloudProfile.avatar_url}
                      alt={soundcloudProfile.username}
                      width={60}
                      height={60}
                      className="rounded-lg"
                    />
                  )}
                  <div>
                    <p className="text-sm text-zinc-400">SoundCloud</p>
                    <p className="font-medium text-white">{soundcloudProfile.username}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  {selectedRA.image && (
                    <Image
                      src={selectedRA.image}
                      alt={selectedRA.name}
                      width={60}
                      height={60}
                      className="rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm text-zinc-400">RA.co</p>
                    <p className="font-medium text-white">{selectedRA.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("ra-search")}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-amber-500 px-6 py-3 font-medium text-black transition hover:bg-amber-400"
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

