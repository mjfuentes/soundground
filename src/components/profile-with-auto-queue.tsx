"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/contexts/player-context";
import type { SoundCloudTrack, SpotlightItem } from "@/lib/soundcloud/client";

interface ProfileWithAutoQueueProps {
  spotlight: SpotlightItem[];
  tracks: SoundCloudTrack[];
  artistName: string;
  artistUrl: string;
  children: React.ReactNode;
}

export function ProfileWithAutoQueue({ 
  spotlight, 
  tracks, 
  artistName, 
  artistUrl,
  children 
}: ProfileWithAutoQueueProps) {
  const { hasPlayedBefore, loadQueue } = usePlayer();
  const hasLoadedQueue = useRef(false);

  useEffect(() => {
    // Only run once per profile
    if (hasLoadedQueue.current) return;
    // Only auto-queue if player has never played anything
    if (!hasPlayedBefore && (spotlight.length > 0 || tracks.length > 0)) {
      const queueItems: Array<{
        id: number;
        url: string;
        title: string;
        artist: string;
        artistUrl: string;
        artwork?: string;
        description?: string;
        type: 'track';
      }> = [];

      // Add spotlight tracks first (only actual tracks, not playlists)
      spotlight.forEach(item => {
        if ('duration' in item && item.duration) {  // It's a track
          queueItems.push({
            id: item.id,
            url: item.permalink_url,
            title: item.title,
            artist: artistName,
            artistUrl: artistUrl,
            artwork: item.artwork_url || undefined,
            description: item.description || undefined,
            type: 'track' as const,
          });
        }
      });

      // Add other tracks
      tracks.forEach(track => {
        // Avoid duplicates from spotlight
        const isAlreadyInQueue = queueItems.some(item => item.id === track.id);
        if (!isAlreadyInQueue && track.duration) {
          queueItems.push({
            id: track.id,
            url: track.permalink_url,
            title: track.title,
            artist: track.user?.username || artistName,
            artistUrl: track.user?.permalink_url || artistUrl,
            artwork: track.artwork_url || undefined,
            description: track.description || undefined,
            type: 'track' as const,
          });
        }
      });

      if (queueItems.length > 0) {
        console.log(`[Auto-Queue] Loading ${queueItems.length} tracks from ${artistName}`);
        loadQueue(queueItems, false); // Don't shuffle - keep spotlight first
        hasLoadedQueue.current = true;
      }
    }
  }, [hasPlayedBefore, spotlight, tracks, artistName, artistUrl, loadQueue]);

  return <>{children}</>;
}

