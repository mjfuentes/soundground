"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";
import { usePlayer } from "@/contexts/player-context";
import { getHighQualityImage } from "@/lib/image-utils";

interface ActivityPostCardProps {
  track: SoundCloudTrack;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function ActivityPostCard({ track }: ActivityPostCardProps) {
  const router = useRouter();
  const { play, currentItem, isPlaying, pause, resume } = usePlayer();

  // Check if track is playable
  const isPlayable = isTrackPlayable(track);
  
  // Check if this is the currently playing track
  const isCurrentTrack = currentItem?.id === track.id;

  const handleClick = () => {
    // Navigate to track page
    router.push(`/track/${track.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isPlayable) return;
    
    if (isCurrentTrack && isPlaying) {
      pause();
    } else if (isCurrentTrack && !isPlaying) {
      resume();
    } else {
      // Create playable item
      const trackItem = {
        id: track.id,
        url: track.permalink_url,
        title: track.title,
        artist: track.user?.username || "Unknown Artist",
        artistUrl: track.user?.permalink_url || "https://soundcloud.com",
        artwork: track.artwork_url?.replace("large.jpg", "original.jpg") 
          || track.user?.avatar_url?.replace("large.jpg", "original.jpg"),
        description: track.description,
        type: "track" as const,
      };
      play(trackItem);
    }
  };

  const artwork = getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url);
  const formattedDate = formatDate(track.created_at);

  return (
    <div 
      onClick={handleClick}
      className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10"
    >
      {/* Background Image */}
      {artwork ? (
        <Image
          src={artwork}
          alt={track.title}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <svg className="h-16 w-16 text-purple-400/30" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      )}
      
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      {/* Not Streamable Badge */}
      {!isPlayable && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
          <span className="flex items-center gap-1 text-xs text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </span>
        </div>
      )}
      
      {/* Play Button Overlay */}
      {isPlayable && (
        <div
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {isCurrentTrack && isPlaying ? (
            <div className="rounded-full bg-white p-3 shadow-xl">
              <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </div>
          ) : (
            <div className="rounded-full bg-white p-3 shadow-xl">
              <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Track Info - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <h3 className="text-xs font-semibold text-white drop-shadow-lg line-clamp-2">
          {track.title}
        </h3>
      </div>
    </div>
  );
}

