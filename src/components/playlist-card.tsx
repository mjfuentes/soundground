"use client";

import { useState } from "react";
import Image from "next/image";
import type { SoundCloudPlaylist, SoundCloudTrack } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";

interface PlaylistCardProps {
  playlist: SoundCloudPlaylist;
  showStats?: boolean;
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
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function isValidTrack(track: unknown): track is SoundCloudTrack {
  if (!track || typeof track !== 'object') return false;
  const t = track as Record<string, unknown>;
  return !!(
    t.id &&
    t.title &&
    t.permalink_url &&
    typeof t.duration === 'number' &&
    t.duration > 0 &&
    (t.streamable !== false || t.access === "preview")
  );
}

export function PlaylistCard({ playlist, showStats = true }: PlaylistCardProps) {
  const { playQueue } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      // Fetch full playlist with tracks
      const response = await fetch(`/api/soundcloud/playlist-tracks?id=${playlist.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch playlist tracks");
      }
      
      const playlistData: SoundCloudPlaylist = await response.json();
      const tracks = playlistData.tracks?.filter(isValidTrack) || [];
      
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
        artwork: track.artwork_url?.replace("large.jpg", "t200x200.jpg"),
        type: "track" as const,
      }));
      
      playQueue(playableItems, true); // true = shuffle
    } catch (error) {
      console.error("Error playing playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="group flex w-full gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-purple-500/50 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Artwork */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gradient-to-br from-purple-500/20 to-purple-600/20">
        {playlist.artwork_url ? (
          <Image
            src={playlist.artwork_url.replace("large.jpg", "t200x200.jpg")}
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
            {playlist.playback_count !== undefined && (
              <span className="flex items-center gap-1" title="Plays">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {formatNumber(playlist.playback_count)}
              </span>
            )}
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
    </button>
  );
}


