"use client";

import { useState } from "react";
import { ActivityPostCard } from "./activity-post-card";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

interface RecentActivityListProps {
  tracks: SoundCloudTrack[];
}

const DEFAULT_SHOWN = 6;

export function RecentActivityList({ tracks }: RecentActivityListProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedTracks = showAll ? tracks : tracks.slice(0, DEFAULT_SHOWN);
  const hasMore = tracks.length > DEFAULT_SHOWN;

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-2xl font-bold text-white">Recent Uploads</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedTracks.map((track: SoundCloudTrack) => (
          <ActivityPostCard key={track.id} track={track} />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="cursor-pointer self-center rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Show more
        </button>
      )}
    </div>
  );
}

