"use client";

import { useState } from "react";
import { FollowerCard } from "./follower-card";

interface Follower {
  id: number;
  permalink: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  track_count?: number;
}

interface TopFollowersProps {
  initialFollowers: Follower[];
}

export function TopFollowers({ initialFollowers }: TopFollowersProps) {
  const [displayCount, setDisplayCount] = useState(48);
  const allFollowers = initialFollowers;
  const displayedFollowers = allFollowers.slice(0, displayCount);
  const hasMore = displayCount < allFollowers.length;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-400">Friends</h3>
      <div className="grid grid-cols-8 gap-2">
        {displayedFollowers.map((follower) => (
          <FollowerCard key={follower.id} follower={follower} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setDisplayCount((prev) => prev + 48)}
          className="self-start text-xs text-amber-400 transition hover:text-amber-300"
        >
          ...more
        </button>
      )}
    </div>
  );
}

