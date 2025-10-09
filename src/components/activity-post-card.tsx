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

export function ActivityPostCard({ track }: ActivityPostCardProps) {
  const router = useRouter();
  const { play, currentItem, isPlaying, pause, resume } = usePlayer();

  // Check if track is playable
  const isPlayable = isTrackPlayable(track);
  
  // Check if this is the currently playing track
  const isCurrentTrack = currentItem?.id === track.id;

  const handleClick = (e: React.MouseEvent) => {
    // If clicking on the play button area, don't navigate
    const target = e.target as HTMLElement;
    if (target.closest('button[data-play-button]')) {
      return;
    }
    // Navigate to track page in same tab
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
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <button
            data-play-button
            onClick={handlePlayClick}
            className="pointer-events-auto cursor-pointer rounded-full bg-white p-2 shadow-xl transition hover:scale-110"
            aria-label={isCurrentTrack && isPlaying ? "Pause" : "Play"}
          >
            {isCurrentTrack && isPlaying ? (
              <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
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

