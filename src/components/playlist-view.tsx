"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";
import { usePlayer } from "@/contexts/player-context";
import { TrackSkeleton } from "@/components/track-skeleton";
import { TrackCard } from "@/components/track-card";
import { RichDescription } from "@/components/rich-description";
import { getHighQualityImage } from "@/lib/image-utils";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";

const MAX_DESCRIPTION_LENGTH_MOBILE = 150;

interface PlaylistViewProps {
  playlistId: string;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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

export function PlaylistView({ playlistId }: PlaylistViewProps) {
  const router = useRouter();
  const { playQueue, currentItem, isPlaying, pause, resume } = usePlayer();
  const [playlist, setPlaylist] = useState<SoundCloudPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    // Scroll to top when playlist page opens
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [playlistId]);

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        setLoading(true);
        const response = await fetch(`/api/soundcloud/playlist-tracks?id=${playlistId}`);
        
        if (!response.ok) {
          throw new Error("Failed to load playlist");
        }

        const data: SoundCloudPlaylist = await response.json();
        
        if (!data) {
          throw new Error("Playlist not found");
        }

        setPlaylist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load playlist");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [playlistId]);

  const handlePlayAll = (shuffle = false) => {
    if (!playlist || !playlist.tracks) return;

    const playableTracks = playlist.tracks.filter(isTrackPlayable);
    if (playableTracks.length === 0) return;

    const playableItems = playableTracks.map(track => ({
      id: track.id,
      url: track.permalink_url,
      title: track.title,
      artist: track.user?.username || "Unknown Artist",
      artistUrl: track.user?.permalink_url || "https://soundcloud.com",
      artwork: getHighQualityImage(track.artwork_url) || getHighQualityImage(track.user?.avatar_url),
      description: track.description,
      type: "track" as const,
    }));

    playQueue(playableItems, shuffle);
  };

  const isCurrentPlaylist = playlist?.tracks?.some(t => t.id === currentItem?.id);

  const getButtonIcon = () => {
    if (isCurrentPlaylist && isPlaying) {
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

  if (error || !playlist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Playlist Not Found</h1>
          <p className="mt-2 text-neutral-400">{error || "This playlist could not be loaded"}</p>
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

  const artwork = getHighQualityImage(playlist.artwork_url) || getHighQualityImage(playlist.tracks?.[0]?.artwork_url);
  const playableTracks = playlist.tracks?.filter(isTrackPlayable) || [];

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Playlist Artwork - Square 1:1 */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg bg-neutral-900">
              {artwork ? (
                <Image
                  src={artwork}
                  alt={playlist.title}
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

          {/* Playlist Info */}
          <div className="flex flex-1 flex-col">
            {/* Title & Type */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-neutral-500">
                  {playlist.is_album ? "Album" : "Playlist"}
                </span>
              </div>
              <h1 className="mb-2 text-2xl font-normal text-white">{playlist.title}</h1>
              {playlist.user?.permalink_url && (
                <p className="text-neutral-400">
                  by{" "}
                  <span
                    className="hover:text-white hover:underline cursor-pointer"
                    onClick={() => {
                      const permalink = playlist.user.permalink_url.split('/').pop();
                      if (permalink) {
                        router.push(`/${permalink}`);
                      }
                    }}
                  >
                    {playlist.user.username || "Unknown Artist"}
                  </span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-3">
              {playableTracks.length > 0 && (
                <>
                  <button
                    onClick={isCurrentPlaylist && isPlaying ? pause : isCurrentPlaylist ? resume : () => handlePlayAll(false)}
                    className="flex flex-1 cursor-pointer items-center justify-center bg-white py-3 px-4 text-black transition-colors hover:bg-neutral-200"
                    aria-label={isCurrentPlaylist && isPlaying ? "Pause" : "Play"}
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
            </div>

            {/* Stats Row */}
            <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
              {playlist.created_at && <span>{formatDate(playlist.created_at)}</span>}
              <span>{playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}</span>
              {playlist.duration > 0 && <span>{formatTotalDuration(playlist.duration)}</span>}
              {playlist.likes_count !== undefined && (
                <span>{formatNumber(playlist.likes_count)} likes</span>
              )}
            </div>

            {/* Description */}
            {playlist.description && (
              <div className="mb-8 border-t border-neutral-800 pt-6">
                {/* Mobile: Truncated description with "Show more" */}
                <div className="md:hidden">
                  {isDescriptionExpanded || playlist.description.length <= MAX_DESCRIPTION_LENGTH_MOBILE ? (
                    <>
                      <RichDescription text={playlist.description} />
                      {playlist.description.length > MAX_DESCRIPTION_LENGTH_MOBILE && (
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
                      <RichDescription text={playlist.description.slice(0, MAX_DESCRIPTION_LENGTH_MOBILE) + '...'} />
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
                  <RichDescription text={playlist.description} />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Tracks List - Show artwork for playlists, simple list for albums */}
        {playlist.tracks && playlist.tracks.length > 0 && (
          <div className="mt-6">
            <div className="space-y-1">
              {playlist.tracks.map((track) => {
                // Skip tracks with no valid data
                if (!track || !track.id || !track.title) {
                  return null;
                }
                
                const handlePlayTrack = () => {
                  if (!isTrackPlayable(track)) return;
                  
                  const trackIndex = playableTracks.findIndex(t => t.id === track.id);
                  if (trackIndex !== -1) {
                    const playableItems = playableTracks.map(t => ({
                      id: t.id,
                      url: t.permalink_url,
                      title: t.title,
                      artist: t.user?.username || "Unknown Artist",
                      artistUrl: t.user?.permalink_url || "https://soundcloud.com",
                      artwork: getHighQualityImage(t.artwork_url) || getHighQualityImage(t.user?.avatar_url),
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

