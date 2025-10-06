"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface FollowerCardProps {
  follower: {
    id: number;
    permalink: string;
    username: string;
    avatar_url?: string;
    followers_count: number;
    track_count?: number;
  };
}

export function FollowerCard({ follower }: FollowerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/${follower.permalink}`}
        className="group relative block aspect-square overflow-hidden rounded-sm bg-white/5 transition hover:bg-white/10"
      >
        {follower.avatar_url ? (
          <Image
            src={follower.avatar_url.replace("large.jpg", "t200x200.jpg")}
            alt={follower.username}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-xs font-medium text-amber-400">
            {follower.username.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      {isHovered && (
        <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 w-32 -translate-x-1/2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative overflow-hidden rounded-lg border border-white/20 shadow-xl">
            <div className="relative aspect-square">
              {follower.avatar_url ? (
                <Image
                  src={follower.avatar_url.replace("large.jpg", "t200x200.jpg")}
                  alt={follower.username}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-3xl font-medium text-amber-400">
                  {follower.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="text-sm font-medium text-white">{follower.username}</p>
              </div>
            </div>
          </div>
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-white/20 bg-zinc-900"></div>
        </div>
      )}
    </div>
  );
}

