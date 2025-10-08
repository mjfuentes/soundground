"use client";

import Image from "next/image";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";

interface AlbumCardProps {
  album: SoundCloudPlaylist;
  showStats?: boolean;
  compact?: boolean;
  coverOnly?: boolean;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function AlbumCard({ album, showStats = true, compact = false, coverOnly = false }: AlbumCardProps) {
  const { play } = usePlayer();

  const handleClick = () => {
    const artworkUrl = album.artwork_url 
      ? album.artwork_url.replace("large.jpg", "t500x500.jpg")
      : album.tracks?.[0]?.artwork_url?.replace("large.jpg", "t500x500.jpg");
    
    play({
      id: album.id,
      url: album.permalink_url,
      title: album.title,
      artist: album.user?.username || "Unknown Artist",
      artistUrl: album.user?.permalink_url || "https://soundcloud.com",
      artwork: artworkUrl,
      description: album.description,
      type: "album",
    });
  };

  // Cover-only mode: just the album art with hover card
  if (coverOnly) {
    // Determine if it's a playlist or album based on set_type
    const isPlaylist = album.set_type === 'playlist';
    const typeLabel = isPlaylist ? 'Playlist' : (album.set_type === 'ep' ? 'EP' : album.set_type === 'compilation' ? 'Compilation' : 'Album');
    
    // Use album artwork, or fallback to first track's artwork
    const coverOnlyArtworkUrl = album.artwork_url 
      ? album.artwork_url.replace("large.jpg", "t500x500.jpg")
      : album.tracks?.[0]?.artwork_url?.replace("large.jpg", "t500x500.jpg");

    return (
      <button
        onClick={handleClick}
        className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-white/5 transition"
      >
        {coverOnlyArtworkUrl ? (
          <Image
            src={coverOnlyArtworkUrl}
            alt={album.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 768px) 120px, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          </div>
        )}
        
        {/* Hover card */}
        <div className="pointer-events-none absolute left-full top-0 z-50 ml-2 hidden w-64 rounded-lg border border-white/20 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-sm group-hover:block">
          <div className="flex gap-3">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded">
              {coverOnlyArtworkUrl ? (
                <Image
                  src={coverOnlyArtworkUrl}
                  alt={album.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                  <svg className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <h4 className="line-clamp-2 text-sm font-medium text-white">
                {album.title}
              </h4>
              <p className="text-xs text-zinc-400">
                {typeLabel} • {album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (compact) {
    // Use album artwork, or fallback to first track's artwork
    const compactArtworkUrl = album.artwork_url 
      ? album.artwork_url.replace("large.jpg", "t500x500.jpg")
      : album.tracks?.[0]?.artwork_url?.replace("large.jpg", "t500x500.jpg");

    return (
      <button
        onClick={handleClick}
        className="group flex w-full cursor-pointer items-center gap-2 text-left"
      >
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 transition">
          {compactArtworkUrl ? (
            <Image
              src={compactArtworkUrl}
              alt={album.title}
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <svg className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="line-clamp-1 text-xs font-medium text-white group-hover:text-purple-400">
            {album.title}
          </h4>
          <p className="text-[10px] text-zinc-500">{album.track_count} tracks</p>
        </div>
      </button>
    );
  }

  // Use album artwork, or fallback to first track's artwork
  const defaultArtworkUrl = album.artwork_url 
    ? album.artwork_url.replace("large.jpg", "t500x500.jpg")
    : album.tracks?.[0]?.artwork_url?.replace("large.jpg", "t500x500.jpg");

  return (
    <button
      onClick={handleClick}
      className="group flex w-full cursor-pointer flex-col gap-2 text-left"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5 transition">
        {defaultArtworkUrl ? (
          <Image
            src={defaultArtworkUrl}
            alt={album.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-12 w-12 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h4 className="line-clamp-2 text-xs font-medium text-white group-hover:text-purple-400">
          {album.title}
        </h4>
        <p className="text-[10px] text-zinc-500">{album.track_count} tracks</p>
        {showStats && (
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            {album.likes_count !== undefined && album.likes_count > 0 && (
              <span className="flex items-center gap-1" title="Likes">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {formatNumber(album.likes_count)}
              </span>
            )}
            {album.reposts_count !== undefined && album.reposts_count > 0 && (
              <span className="flex items-center gap-1" title="Reposts">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
                {formatNumber(album.reposts_count)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

