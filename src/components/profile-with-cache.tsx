"use client";

import { useState, useEffect } from "react";
import { ClientProfileCache, type ProfileDiff } from "@/lib/client-profile-cache";
import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist, SpotlightItem } from "@/lib/soundcloud/client";

interface ProfileWithCacheProps {
  handle: string;
  freshData: {
    profile: SoundCloudUser;
    spotlight: SpotlightItem[];
    playlists: SoundCloudPlaylist[];
    albums: SoundCloudPlaylist[];
    tracks: SoundCloudTrack[];
  };
  children: React.ReactNode;
}

export function ProfileWithCache({ handle, freshData, children }: ProfileWithCacheProps) {
  const [diff, setDiff] = useState<ProfileDiff | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    // Check cache and compare
    const cached = ClientProfileCache.get(handle);
    
    if (cached) {
      const differences = ClientProfileCache.diff(cached, freshData);
      if (differences.hasChanges) {
        setDiff(differences);
        setShowDiff(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setShowDiff(false), 10000);
      }
    }

    // Cache the fresh data
    ClientProfileCache.set(handle, freshData);
  }, [handle, freshData]);

  return (
    <>
      {/* Diff notification banner */}
      {showDiff && diff && diff.hasChanges && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-in slide-in-from-right">
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-300">Profile Updated</h4>
                <div className="mt-1 text-xs text-green-400/80 space-y-0.5">
                  {diff.newTracks > 0 && <div>+{diff.newTracks} new track{diff.newTracks > 1 ? 's' : ''}</div>}
                  {diff.newAlbums > 0 && <div>+{diff.newAlbums} new album{diff.newAlbums > 1 ? 's' : ''}</div>}
                  {diff.newPlaylists > 0 && <div>+{diff.newPlaylists} new playlist{diff.newPlaylists > 1 ? 's' : ''}</div>}
                  {diff.newSpotlight > 0 && <div>+{diff.newSpotlight} in spotlight</div>}
                  {diff.removedTracks > 0 && <div className="text-red-400/70">-{diff.removedTracks} track{diff.removedTracks > 1 ? 's' : ''} removed</div>}
                  {diff.removedAlbums > 0 && <div className="text-red-400/70">-{diff.removedAlbums} album{diff.removedAlbums > 1 ? 's' : ''} removed</div>}
                </div>
              </div>
              <button
                onClick={() => setShowDiff(false)}
                className="flex-shrink-0 text-green-400/60 hover:text-green-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

