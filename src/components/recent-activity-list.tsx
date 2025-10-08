"use client";

import { useState } from "react";
import { TrackCard } from "./track-card";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

interface RecentActivityListProps {
  tracks: SoundCloudTrack[];
}

const DEFAULT_SHOWN = 12;

export function RecentActivityList({ tracks }: RecentActivityListProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedTracks = showAll ? tracks : tracks.slice(0, DEFAULT_SHOWN);
  const hasMore = tracks.length > DEFAULT_SHOWN;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
      <div className="flex flex-col gap-1.5">
        {displayedTracks.map((track: SoundCloudTrack) => (
          <TrackCard key={track.id} track={track} showStats={true} />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="cursor-pointer self-start text-xs text-amber-400 transition hover:text-amber-300"
        >
          ...more
        </button>
      )}
    </div>
  );
}

