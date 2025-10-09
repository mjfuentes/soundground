"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";
import { TrackSkeleton } from "@/components/track-skeleton";
import { RichDescription } from "@/components/rich-description";
import { TrackCard } from "@/components/track-card";
import { getHighQualityImage } from "@/lib/image-utils";

interface TrackViewProps {
  trackId: string;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
  icon: React.ReactElement;
}

function detectExternalLinks(track: SoundCloudTrack): ExternalLink[] {
  const links: ExternalLink[] = [];
  const foundPlatforms = new Set<string>();
  
  // Helper to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  // Helper to identify platform and action
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
  
  // Priority 1: Check purchase_url first
  if (track.purchase_url) {
    const platform = identifyPlatform(track.purchase_url);
    if (platform && !foundPlatforms.has(platform.platform)) {
      links.push(platform);
      foundPlatforms.add(platform.platform);
    }
  }
  
  // Priority 2: Check download_url
  if (track.download_url) {
    const platform = identifyPlatform(track.download_url);
    if (platform && !foundPlatforms.has(platform.platform)) {
      links.push(platform);
      foundPlatforms.add(platform.platform);
    }
  }
  
  // Priority 3: Check description for URLs (only if platform not found yet)
  if (track.description) {
    const urls = extractUrls(track.description);
    for (const url of urls) {
      const platform = identifyPlatform(url);
      if (platform && !foundPlatforms.has(platform.platform)) {
        links.push(platform);
        foundPlatforms.add(platform.platform);
      }
    }
  }
  
  // If no external links found and track is > 15 minutes (likely a mix), show SoundCloud link
  const fifteenMinutes = 15 * 60 * 1000;
  if (links.length === 0 && track.duration > fifteenMinutes) {
    links.push({
      url: track.permalink_url,
      platform: 'SoundCloud',
      action: 'Listen',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 15.5v-1c0-.3.2-.5.5-.5s.5.2.5.5v1c0 .3-.2.5-.5.5s-.5-.2-.5-.5zm2-3v4c0 .3.2.5.5.5s.5-.2.5-.5v-4c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2-1v6c0 .3.2.5.5.5s.5-.2.5-.5v-6c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2-2v8c0 .3.2.5.5.5s.5-.2.5-.5v-8c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2-1v10c0 .3.2.5.5.5s.5-.2.5-.5v-10c0-.3-.2-.5-.5-.5s-.5.2-.5.5zm2.5-.5c-.3 0-.5.2-.5.5v10.5c0 .8.7 1.5 1.5 1.5h7.5c1.9 0 3.5-1.6 3.5-3.5s-1.6-3.5-3.5-3.5c-.4 0-.7.1-1.1.2-.5-1.3-1.7-2.2-3.1-2.2-1.8 0-3.3 1.5-3.3 3.3v2.2c0 .3-.2.5-.5.5s-.5-.2-.5-.5V8c0-.3-.2-.5-.5-.5z"/>
        </svg>
      )
    });
  }
  
  return links;
}

export function TrackView({ trackId }: TrackViewProps) {
  const router = useRouter();
  const { play, load, currentItem, isPlaying, isPaused, pause, resume, currentTime, queue } = usePlayer();
  const [track, setTrack] = useState<SoundCloudTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistTracks, setArtistTracks] = useState<SoundCloudTrack[]>([]);

  // Scroll to top when track page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [trackId]);

  useEffect(() => {
    async function fetchTrack() {
      try {
        setLoading(true);
        const response = await fetch(`/api/soundcloud/track/${trackId}`);
        
        if (!response.ok) {
          throw new Error("Failed to load track");
        }

        const data = await response.json();
        
        if (!data.track) {
          throw new Error("Track not found");
        }

        setTrack(data.track);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load track");
      } finally {
        setLoading(false);
      }
    }

    fetchTrack();
  }, [trackId]);

  // Fetch more tracks from the artist
  useEffect(() => {
    async function fetchArtistTracks() {
      if (!track?.user?.id) return;
      
      try {
        const response = await fetch(`/api/soundcloud/user-tracks?userId=${track.user.id}&limit=10`);
        if (!response.ok) return;
        
        const data = await response.json();
        // Filter out the current track and show up to 6 tracks
        const otherTracks = data.tracks?.collection?.filter((t: SoundCloudTrack) => t.id !== track.id).slice(0, 6) || [];
        setArtistTracks(otherTracks);
      } catch (err) {
        console.error("Failed to load artist tracks:", err);
      }
    }

    fetchArtistTracks();
  }, [track]);

  // Auto-load track into player with smart replacement logic
  useEffect(() => {
    // Don't auto-load if track hasn't loaded or is already current
    if (!track || currentItem?.id === Number(trackId)) return;

    const trackItem = {
      id: track.id,
      url: track.permalink_url,
      title: track.title,
      artist: track.user?.username || "Unknown Artist",
      artistUrl: track.user?.permalink_url || "https://soundcloud.com",
      artwork: getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url),
      description: track.description,
      type: "track" as const,
    };

    // Case 1: No track loaded - auto-load in paused state
    if (!currentItem) {
      load(trackItem);
      return;
    }

    // Case 2: Track is paused, never played (currentTime ≈ 0), and no queue
    // Replace it with the new track (user is browsing, not committed to playing)
    const neverPlayed = currentTime < 1; // Less than 1 second played
    const noQueue = queue.length === 0;
    const isPausedState = isPaused && !isPlaying;
    
    if (isPausedState && neverPlayed && noQueue) {
      load(trackItem);
      return;
    }

    // Case 3: Track is playing, paused but played, or in a queue - don't auto-replace
    // User must explicitly click Play to switch tracks
  }, [track, currentItem, trackId, load, currentTime, queue, isPaused, isPlaying]);

  const handlePlayPause = () => {
    if (!track) return;

    const trackItem = {
      id: track.id,
      url: track.permalink_url,
      title: track.title,
      artist: track.user?.username || "Unknown Artist",
      artistUrl: track.user?.permalink_url || "https://soundcloud.com",
      artwork: getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url),
      description: track.description,
      type: "track" as const,
    };

    // If this is the current track and it's playing, pause it
    if (isCurrentTrack && isPlaying) {
      pause();
    }
    // If this is the current track and it's paused, resume it
    else if (isCurrentTrack && isPaused) {
      resume();
    }
    // Otherwise play the track
    else {
      play(trackItem);
    }
  };

  const isCurrentTrack = currentItem?.id === Number(trackId);
  
  // Determine button icon
  const getButtonIcon = () => {
    if (isCurrentTrack && isPlaying) {
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

  if (error || !track) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Track Not Found</h1>
          <p className="mt-2 text-neutral-400">{error || "This track could not be loaded"}</p>
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

  const artwork = getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url);

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8 md:flex-row md:gap-12">
            {/* Album Art - Square 1:1 */}
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative h-80 w-80 overflow-hidden rounded-lg bg-neutral-900">
              {artwork ? (
                <Image
                  src={artwork}
                  alt={track.title}
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                  quality={100}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-20 w-20 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="flex flex-1 flex-col">
            {/* Title & Artist */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-neutral-500">
                  {track.duration > 20 * 60 * 1000 ? "Mix" : "Track"}
                </span>
              </div>
              <h1 className="mb-2 text-2xl font-normal text-white">{track.title}</h1>
              <p className="text-neutral-400">
                by{" "}
                {track.user?.permalink_url ? (
                  <Link
                    href={`/${track.user.permalink_url.split('/').pop()}`}
                    className="cursor-pointer transition-colors hover:text-white hover:underline"
                  >
                    {track.user.username || "Unknown Artist"}
                  </Link>
                ) : (
                  <span>{track.user?.username || "Unknown Artist"}</span>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-3">
              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                className="flex flex-1 cursor-pointer items-center justify-center bg-white py-3 px-4 text-black transition-colors hover:bg-neutral-200"
                aria-label={isCurrentTrack && isPlaying ? "Pause" : "Play"}
              >
                {getButtonIcon()}
              </button>
              
              {/* External Links (Buy/Download) */}
              {detectExternalLinks(track).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-white/20 bg-transparent py-3 px-4 text-center font-medium text-white transition-colors hover:border-white/40 hover:bg-white/10"
                  title={link.platform === 'Hypeddit' ? link.action : `${link.action} on ${link.platform}`}
                >
                  {link.icon}
                  <span>{link.platform === 'Hypeddit' ? link.action : `${link.action} on ${link.platform}`}</span>
                </a>
              ))}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
              {track.created_at && <span>{formatDate(track.created_at)}</span>}
              <span>{formatDuration(track.duration)}</span>
              {track.genre && <span className="capitalize">{track.genre}</span>}
              {track.playback_count !== undefined && (
                <span>{formatNumber(track.playback_count)} plays</span>
              )}
            </div>
          </div>
        </div>

        {/* Description - Full width below cover art on desktop */}
        {track.description && (
          <div className="border-t border-neutral-800 pt-6 mt-6">
            <RichDescription text={track.description} />
          </div>
        )}

        {/* More from Artist */}
        {artistTracks.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                More from {track.user?.username || "this artist"}
              </h2>
              {track.user?.permalink_url && (
                <Link
                  href={`/${track.user.permalink_url.split('/').pop()}`}
                  className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  View profile →
                </Link>
              )}
            </div>
            <div className="space-y-1">
              {artistTracks.map((artistTrack) => (
                <TrackCard
                  key={artistTrack.id}
                  track={artistTrack}
                  showStats={false}
                />
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

