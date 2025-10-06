"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LinkedPlatformsProps {
  soundcloudPermalink: string;
}

export function LinkedPlatforms({ soundcloudPermalink }: LinkedPlatformsProps) {
  const [raProfile, setRaProfile] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    const storedProfile = localStorage.getItem("cloudmate_profile");
    if (storedProfile) {
      try {
        const data = JSON.parse(storedProfile);
        // Check if this is the same SoundCloud profile
        if (data.soundcloud?.permalink === soundcloudPermalink && data.ra) {
          setRaProfile(data.ra);
        }
      } catch (error) {
        console.error("Error parsing profile:", error);
      }
    }
  }, [soundcloudPermalink]);

  if (!raProfile) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-400">Linked Platforms</h3>
      <Link
        href={raProfile.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-purple-400/50 hover:bg-white/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
          <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white group-hover:text-purple-400">RA.co</p>
          <p className="text-xs text-zinc-400">{raProfile.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            href={`${raProfile.url}/events`}
            className="text-xs text-purple-400 transition hover:text-purple-300 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View Events →
          </Link>
        </div>
      </Link>
    </div>
  );
}

