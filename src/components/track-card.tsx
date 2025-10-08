"use client";

import React from "react";
import Image from "next/image";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";

interface TrackCardProps {
  track: SoundCloudTrack;
  showStats?: boolean;
  playlistTracks?: SoundCloudTrack[]; // All tracks from the playlist for queue
  coverOnly?: boolean;
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  
  // If same year, show DD.MM, otherwise show DD.MM.YY
  if (year === currentYear) {
    return `${day}.${month}`;
  } else {
    const yearShort = String(year).slice(-2);
    return `${day}.${month}.${yearShort}`;
  }
}

function getDownloadPlatform(url: string): { platform: string; action: string; icon: React.ReactElement } | null {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('bandcamp.com')) {
    return {
      platform: 'Bandcamp',
      action: 'Buy',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 18.75l7.437-13.5h16.563l-7.438 13.5z"/>
        </svg>
      )
    };
  }
  
  if (lowerUrl.includes('hypeddit.com')) {
    return {
      platform: 'Hypeddit',
      action: 'Download',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
        </svg>
      )
    };
  }
  
  if (lowerUrl.includes('beatport.com')) {
    return {
      platform: 'Beatport',
      action: 'Buy',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      )
    };
  }
  
  return null;
}

export function TrackCard({ track, showStats = true, playlistTracks, coverOnly = false }: TrackCardProps) {
  const { play, playTrackWithQueue } = usePlayer();

  // Check if track is playable
  const isPlayable = track.streamable !== false && 
                     (!track.access || track.access === "playable");
  
  const isPreviewOnly = track.access === "preview";

  const handleClick = () => {
    if (!isPlayable && !isPreviewOnly) {
      // Open in SoundCloud if not playable
      window.open(track.permalink_url, '_blank');
      return;
    }
    
    if (track.permalink_url && track.id) {
      const currentTrackItem = {
        id: track.id,
        url: track.permalink_url,
        title: track.title,
        artist: track.user?.username || "Unknown Artist",
        artistUrl: track.user?.permalink_url || "https://soundcloud.com",
        artwork: track.artwork_url?.replace("large.jpg", "t500x500.jpg"),
        description: track.description,
        type: "track" as const,
      };

      // If we have playlist context, add other tracks to queue
      if (playlistTracks && playlistTracks.length > 1) {
        const otherTracks = playlistTracks
          .filter(t => t.id !== track.id && (t.streamable !== false || t.access === "preview"))
          .map(t => ({
            id: t.id,
            url: t.permalink_url,
            title: t.title,
            artist: t.user?.username || "Unknown Artist",
            artistUrl: t.user?.permalink_url || "https://soundcloud.com",
            artwork: t.artwork_url?.replace("large.jpg", "t500x500.jpg"),
            description: t.description,
            type: "track" as const,
          }));

        playTrackWithQueue(currentTrackItem, otherTracks, true); // true = shuffle others
      } else {
        // No playlist context, just play the track
        play(currentTrackItem);
      }
    }
  };

  // Cover-only mode: just the artwork
  if (coverOnly) {
    const imageUrl = track.artwork_url?.replace("large.jpg", "t500x500.jpg") 
      || track.user?.avatar_url?.replace("large.jpg", "t500x500.jpg");
    const downloadLink = track.purchase_url || track.download_url;
    const downloadPlatform = downloadLink ? getDownloadPlatform(downloadLink) : null;
    
    return (
      <button
        onClick={handleClick}
        className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-white/5 transition"
        title={track.title}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={track.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 768px) 120px, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
        {downloadPlatform && (
          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/80"
            title={`${downloadPlatform.action} on ${downloadPlatform.platform}`}
          >
            {downloadPlatform.icon}
          </a>
        )}
      </button>
    );
  }

  const content = (
    <>
      {/* Album Art */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gradient-to-br from-purple-500/20 to-purple-600/20">
        {(track.artwork_url || track.user?.avatar_url) ? (
          <Image
            src={(track.artwork_url || track.user?.avatar_url)?.replace("large.jpg", "t500x500.jpg") || ""}
            alt={track.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-purple-400/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium text-white group-hover:text-purple-400">
              {track.title}
            </h4>
            {!isPlayable && !isPreviewOnly && (
              <span className="flex-shrink-0 text-xs text-zinc-500" title="Not streamable - click to open in SoundCloud">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </span>
            )}
            {isPreviewOnly && (
              <span className="flex-shrink-0 rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400" title="Preview only">
                Preview
              </span>
            )}
            {(() => {
              const downloadLink = track.purchase_url || track.download_url;
              const downloadPlatform = downloadLink ? getDownloadPlatform(downloadLink) : null;
              return downloadPlatform ? (
                <a
                  href={downloadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 text-amber-400 transition hover:text-amber-300"
                  title={`${downloadPlatform.action} on ${downloadPlatform.platform}`}
                >
                  {downloadPlatform.icon}
                </a>
              ) : null;
            })()}
          </div>
          <p className="text-xs text-zinc-400">
            {formatDuration(track.duration)}
            {track.genre && ` • ${track.genre}`}
            {(() => {
              const formattedDate = formatDate(track.created_at);
              return formattedDate ? <> • <span className="font-bold text-zinc-300">{formattedDate}</span></> : null;
            })()}
          </p>
        </div>

        {showStats && (
          <>
            <div className="flex gap-3 text-xs text-zinc-400">
              {track.likes_count !== undefined && (
                <span className="flex items-center gap-1" title="Likes">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {formatNumber(track.likes_count)}
                </span>
              )}
              {track.reposts_count !== undefined && track.reposts_count > 0 && (
                <span className="flex items-center gap-1" title="Reposts">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                  </svg>
                  {formatNumber(track.reposts_count)}
                </span>
              )}
              {track.comment_count !== undefined && track.comment_count > 0 && (
                <span className="flex items-center gap-1" title="Comments">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                  </svg>
                  {formatNumber(track.comment_count)}
                </span>
              )}
            </div>

            {/* Comments not available through public API */}
          </>
        )}
      </div>
    </>
  );

  if (!track.permalink_url) {
    return (
      <div className="group flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3 opacity-75">
        {content}
      </div>
    );
  }

  const buttonClasses = isPlayable || isPreviewOnly
    ? "group flex w-full cursor-pointer gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-purple-500/50 hover:bg-purple-500/10"
    : "group flex w-full cursor-pointer gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-orange-500/50 hover:bg-orange-500/10 opacity-75";

  const buttonTitle = isPlayable || isPreviewOnly
    ? "Play track"
    : "Not streamable - click to open in SoundCloud";

  return (
    <button
      onClick={handleClick}
      className={buttonClasses}
      title={buttonTitle}
    >
      {content}
    </button>
  );
}

