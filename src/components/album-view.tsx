"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";
import { TrackSkeleton } from "@/components/track-skeleton";
import { TrackCard } from "@/components/track-card";
import { RichDescription } from "@/components/rich-description";
import { getHighQualityImage } from "@/lib/image-utils";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";
import type { ReactElement } from "react";

const MAX_DESCRIPTION_LENGTH_MOBILE = 150;

interface AlbumViewProps {
  playlistId: string;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatRoundedPlays(num: number): string {
  if (num === 0) return "0";
  if (num < 10) return num.toString();
  
  // Round down to appropriate milestone
  let rounded: number;
  
  if (num >= 1000000) {
    // Millions: round to 1M, 5M, 10M, 50M, 100M, etc.
    const millions = num / 1000000;
    if (millions >= 100) rounded = Math.floor(millions / 100) * 100000000;
    else if (millions >= 50) rounded = Math.floor(millions / 50) * 50000000;
    else if (millions >= 10) rounded = Math.floor(millions / 10) * 10000000;
    else if (millions >= 5) rounded = Math.floor(millions / 5) * 5000000;
    else rounded = Math.floor(millions) * 1000000;
    return `${(rounded / 1000000).toFixed(0)}M+`;
  }
  
  if (num >= 100000) {
    // Hundred thousands: round to 100K, 500K
    const hundredK = num / 100000;
    if (hundredK >= 5) rounded = Math.floor(hundredK / 5) * 500000;
    else rounded = Math.floor(hundredK) * 100000;
    return `${(rounded / 1000).toFixed(0)}K+`;
  }
  
  if (num >= 10000) {
    // Ten thousands: round to 10K, 50K
    const tenK = num / 10000;
    if (tenK >= 5) rounded = Math.floor(tenK / 5) * 50000;
    else rounded = Math.floor(tenK) * 10000;
    return `${(rounded / 1000).toFixed(0)}K+`;
  }
  
  if (num >= 1000) {
    // Thousands: round to 1K, 5K
    const thousands = num / 1000;
    if (thousands >= 5) rounded = Math.floor(thousands / 5) * 5000;
    else rounded = Math.floor(thousands) * 1000;
    return `${(rounded / 1000).toFixed(0)}K+`;
  }
  
  if (num >= 100) {
    // Hundreds: round to 100, 500
    if (num >= 500) rounded = Math.floor(num / 500) * 500;
    else rounded = Math.floor(num / 100) * 100;
    return `${rounded}+`;
  }
  
  // Below 100: round down to nearest 5
  rounded = Math.floor(num / 5) * 5;
  return `${rounded}+`;
}

function formatTotalDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

interface ExternalLink {
  url: string;
  platform: string;
  action: string;
  icon: ReactElement;
}

function detectExternalLinks(album: SoundCloudPlaylist): ExternalLink[] {
  const links: ExternalLink[] = [];
  const foundPlatforms = new Set<string>();
  
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  const identifyPlatform = (url: string): ExternalLink | null => {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('bandcamp.com')) {
      return {
        url,
        platform: 'Bandcamp',
        action: 'Buy',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 18.75l7.437-13.5h16.563l-7.438 13.5z"/>
          </svg>
        )
      };
    }
    
    if (lowerUrl.includes('hypeddit.com')) {
      return {
        url,
        platform: 'Hypeddit',
        action: 'Free Download',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
          </svg>
        )
      };
    }
    
    if (lowerUrl.includes('beatport.com')) {
      return {
        url,
        platform: 'Beatport',
        action: 'Buy',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        )
      };
    }
    
    return null;
  };
  
  // Check purchase_url
  if (album.purchase_url) {
    const platform = identifyPlatform(album.purchase_url);
    if (platform && !foundPlatforms.has(platform.platform)) {
      links.push(platform);
      foundPlatforms.add(platform.platform);
    }
  }
  
  // Check download_url
  if (album.download_url) {
    const platform = identifyPlatform(album.download_url);
    if (platform && !foundPlatforms.has(platform.platform)) {
      links.push(platform);
      foundPlatforms.add(platform.platform);
    }
  }
  
  // Check description
  if (album.description) {
    const urls = extractUrls(album.description);
    for (const url of urls) {
      const platform = identifyPlatform(url);
      if (platform && !foundPlatforms.has(platform.platform)) {
        links.push(platform);
        foundPlatforms.add(platform.platform);
      }
    }
  }
  
  return links;
}

export function AlbumView({ playlistId }: AlbumViewProps) {
  const router = useRouter();
  const { playQueue, currentItem, isPlaying, pause, resume } = usePlayer();
  const [album, setAlbum] = useState<SoundCloudPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [playlistId]);

  useEffect(() => {
    async function fetchAlbum() {
      try {
        setLoading(true);
        const response = await fetch(`/api/soundcloud/playlist-tracks?id=${playlistId}`);
        
        if (!response.ok) {
          throw new Error("Failed to load album");
        }

        const data: SoundCloudPlaylist = await response.json();
        
        if (!data) {
          throw new Error("Album not found");
        }

        setAlbum(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load album");
      } finally {
        setLoading(false);
      }
    }

    fetchAlbum();
  }, [playlistId]);

  const handlePlayAll = (shuffle = false) => {
    if (!album || !album.tracks) return;

    const playableTracks = album.tracks.filter(isTrackPlayable);
    if (playableTracks.length === 0) return;

    const playableItems = playableTracks.map(track => ({
      id: track.id,
      url: track.permalink_url,
      title: track.title,
      artist: track.user?.username || "Unknown Artist",
      artistUrl: track.user?.permalink_url || "https://soundcloud.com",
      artwork: getHighQualityImage(album.artwork_url) || getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url),
      description: track.description,
      type: "track" as const,
    }));

    playQueue(playableItems, shuffle);
  };

  const isCurrentAlbum = album?.tracks?.some(t => t.id === currentItem?.id);

  const getButtonIcon = () => {
    if (isCurrentAlbum && isPlaying) {
      return (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      );
    }
    return (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    );
  };

  if (loading) {
    return <TrackSkeleton />;
  }

  if (error || !album) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Album Not Found</h1>
          <p className="mt-2 text-neutral-400">{error || "This album could not be loaded"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 cursor-pointer rounded-lg bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const artwork = getHighQualityImage(album.artwork_url) || getHighQualityImage(album.tracks?.[0]?.artwork_url);
  const playableTracks = album.tracks?.filter(isTrackPlayable) || [];
  const albumType = album.set_type === 'ep' ? 'EP' : album.set_type === 'compilation' ? 'Compilation' : 'Album';
  const purchaseLinks = detectExternalLinks(album);
  
  // Calculate total plays from all tracks
  const totalPlays = album.tracks?.reduce((sum, track) => sum + (track.playback_count || 0), 0) || 0;

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="group mb-4 flex cursor-pointer items-center gap-1 text-sm font-medium text-neutral-400 transition-all hover:text-white"
        >
          <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Album Artwork - Square 1:1 */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg bg-neutral-900">
              {artwork ? (
                <Image
                  src={artwork}
                  alt={album.title}
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                  quality={100}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-20 w-20 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Album Info */}
          <div className="flex flex-1 flex-col">
            {/* Title & Type */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-neutral-500">{albumType}</span>
              </div>
              <h1 className="mb-2 text-2xl font-normal text-white">{album.title}</h1>
              {album.user && (
                <Link
                  href={`/${album.user.permalink_url.split('/').pop()}`}
                  className="text-neutral-400 hover:text-white hover:underline"
                >
                  {album.user.username || "Unknown Artist"}
                </Link>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-3">
              {playableTracks.length > 0 && (
                <>
                  <button
                    onClick={isCurrentAlbum && isPlaying ? pause : isCurrentAlbum ? resume : () => handlePlayAll(false)}
                    className="flex flex-1 cursor-pointer items-center justify-center bg-white py-3 px-4 text-black transition-colors hover:bg-neutral-200"
                    aria-label={isCurrentAlbum && isPlaying ? "Pause" : "Play"}
                  >
                    {getButtonIcon()}
                  </button>
                  <button
                    onClick={() => handlePlayAll(true)}
                    className="flex flex-1 cursor-pointer items-center justify-center bg-white/10 py-3 px-4 text-white transition-colors hover:bg-white/20"
                    aria-label="Shuffle"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                    </svg>
                  </button>
                </>
              )}
              
              {/* External Links (Buy/Download) */}
              {purchaseLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 border border-white/20 bg-transparent py-3 text-center font-medium text-white transition-colors hover:border-white/40 hover:bg-white/10 md:flex-1 md:px-8"
                  title={link.platform === 'Hypeddit' ? link.action : `${link.action} on ${link.platform}`}
                >
                  {link.icon}
                  <span>{link.platform === 'Hypeddit' ? link.action : `${link.action} on ${link.platform}`}</span>
                </a>
              ))}
            </div>

            {/* Stats Row */}
            <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
              {album.created_at && <span>{formatDate(album.created_at)}</span>}
              <span>{album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}</span>
              {album.duration > 0 && <span>{formatTotalDuration(album.duration)}</span>}
              {totalPlays > 0 && (
                <span>{formatRoundedPlays(totalPlays)} plays</span>
              )}
            </div>

            {/* Description */}
            {album.description && (
              <div className="mb-8 border-t border-neutral-800 pt-6">
                {/* Mobile: Truncated description with "Show more" */}
                <div className="md:hidden">
                  {isDescriptionExpanded || album.description.length <= MAX_DESCRIPTION_LENGTH_MOBILE ? (
                    <>
                      <RichDescription text={album.description} />
                      {album.description.length > MAX_DESCRIPTION_LENGTH_MOBILE && (
                        <button
                          onClick={() => setIsDescriptionExpanded(false)}
                          className="mt-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                          Show less
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <RichDescription text={album.description.slice(0, MAX_DESCRIPTION_LENGTH_MOBILE) + '...'} />
                      <button
                        onClick={() => setIsDescriptionExpanded(true)}
                        className="mt-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        Show more
                      </button>
                    </>
                  )}
                </div>
                {/* Desktop: Full description */}
                <div className="hidden md:block">
                  <RichDescription text={album.description} />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Tracks List - Using TrackCard */}
        {album.tracks && album.tracks.length > 0 && (
          <div className="mt-6">
            <div className="space-y-1">
              {album.tracks.map((track) => {
                const handleTrackPlay = () => {
                  if (!isTrackPlayable(track)) return;
                  
                  const trackIndex = playableTracks.findIndex(t => t.id === track.id);
                  if (trackIndex !== -1) {
                    const playableItems = playableTracks.map(t => ({
                      id: t.id,
                      url: t.permalink_url,
                      title: t.title,
                      artist: t.user?.username || "Unknown Artist",
                      artistUrl: t.user?.permalink_url || "https://soundcloud.com",
                      artwork: getHighQualityImage(album.artwork_url) || getHighQualityImage(t.artwork_url) || getHighQualityImage(t.user?.avatar_url),
                      description: t.description,
                      type: "track" as const,
                    }));
                    playQueue(playableItems.slice(trackIndex), false);
                  }
                };
                
                return (
                  <TrackCard
                    key={track.id}
                    track={track}
                    playlistTracks={playableTracks}
                    showStats={false}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

