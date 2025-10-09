"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";
import { usePlayer } from "@/contexts/player-context";
import { getHighQualityImage } from "@/lib/image-utils";

interface PlaylistCardProps {
  playlist: SoundCloudPlaylist;
  showStats?: boolean;
  coverOnly?: boolean;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlaylistCard({ playlist, showStats = true, coverOnly = false }: PlaylistCardProps) {
  const router = useRouter();
  const { playQueue, currentItem, isPlaying, pause, resume } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if any track from this playlist is currently playing
  const isCurrentPlaylist = playlist.tracks?.some(t => t.id === currentItem?.id);

  const handleClick = () => {
    // Navigate to playlist page
    router.push(`/playlist/${playlist.id}`);
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    try {
      setIsLoading(true);
      
      // If this playlist is currently playing, toggle play/pause
      if (isCurrentPlaylist) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        setIsLoading(false);
        return;
      }
      
      // Fetch full playlist with tracks
      const response = await fetch(`/api/soundcloud/playlist-tracks?id=${playlist.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch playlist tracks");
      }
      
      const playlistData: SoundCloudPlaylist = await response.json();
      const tracks = playlistData.tracks?.filter(isTrackPlayable) || [];
      
      if (tracks.length === 0) {
        throw new Error("No playable tracks in playlist");
      }
      
      // Convert tracks to PlayableItems and shuffle
      const playableItems = tracks.map(track => ({
        id: track.id,
        url: track.permalink_url,
        title: track.title,
        artist: track.user?.username || "Unknown Artist",
        artistUrl: track.user?.permalink_url || "https://soundcloud.com",
        artwork: getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url),
        description: track.description,
        type: "track" as const,
      }));
      
      playQueue(playableItems, true); // true = shuffle
    } catch (error) {
      console.error("Error playing playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cover-only mode: just the artwork
  if (coverOnly) {
    // Use playlist artwork, or fallback to first track's artwork
    const imageUrl = getHighQualityImage(playlist.artwork_url) || getHighQualityImage(playlist.tracks?.[0]?.artwork_url);
    
    const handleCoverClick = () => {
      // On mobile, always navigate to playlist page
      router.push(`/playlist/${playlist.id}`);
    };
    
    return (
      <div
        onClick={handleCoverClick}
        className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-white/5 transition touch-manipulation"
        title={playlist.title}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={playlist.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 768px) 120px, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          </div>
        )}
        {/* Play Button Overlay - hidden on mobile (only shows on desktop hover) */}
        <div className="absolute inset-0 z-20 hidden sm:flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <button
            data-play-button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayClick(e);
            }}
            disabled={isLoading}
            className="pointer-events-auto cursor-pointer rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition hover:scale-110 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isCurrentPlaylist && isPlaying ? "Pause" : "Play"}
          >
            {isCurrentPlaylist && isPlaying ? (
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Use playlist artwork, or fallback to first track's artwork
  const artworkUrl = getHighQualityImage(playlist.artwork_url) || getHighQualityImage(playlist.tracks?.[0]?.artwork_url);

  return (
    <div
      onClick={handleClick}
      className="group flex w-full cursor-pointer gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-purple-500/50 hover:bg-purple-500/10"
    >
      {/* Artwork */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gradient-to-br from-purple-500/20 to-purple-600/20">
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={playlist.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-purple-400/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          </div>
        )}
        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          disabled={isLoading}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCurrentPlaylist && isPlaying ? (
            <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Playlist Info */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div>
          <h4 className="truncate text-sm font-medium text-white group-hover:text-purple-400">
            {playlist.title}
          </h4>
          <p className="text-xs text-zinc-400">
            {playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}
            {playlist.duration > 0 && ` • ${formatDuration(playlist.duration)}`}
          </p>
        </div>

        {showStats && (
          <div className="flex gap-3 text-xs text-zinc-400">
            {playlist.likes_count !== undefined && (
              <span className="flex items-center gap-1" title="Likes">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {formatNumber(playlist.likes_count)}
              </span>
            )}
            {playlist.reposts_count !== undefined && playlist.reposts_count > 0 && (
              <span className="flex items-center gap-1" title="Reposts">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
                {formatNumber(playlist.reposts_count)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


