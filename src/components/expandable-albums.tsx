"use client";

import { useState } from "react";
import { PlaylistCard } from "./playlist-card";
import { TrackCard } from "./track-card";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface ExpandableAlbumsProps {
  albums: SoundCloudPlaylist[];
  title: string;
}

const DEFAULT_SHOWN = 3;

export function ExpandableAlbums({ albums, title }: ExpandableAlbumsProps) {
  const [showAll, setShowAll] = useState(false);

  // Keep albums in the exact order the API provides them
  const displayedAlbums = showAll 
    ? albums
    : albums.slice(0, DEFAULT_SHOWN);
  const hasMore = albums.length > DEFAULT_SHOWN;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {displayedAlbums.map((album: SoundCloudPlaylist) => {
          // If album has only one track, render it as a track
          if (album.tracks?.length === 1) {
            return <TrackCard key={album.id} track={album.tracks[0]} showStats={false} coverOnly={true} />;
          }
          return <PlaylistCard key={album.id} playlist={album} showStats={false} coverOnly={true} />;
        })}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="cursor-pointer self-start text-xs text-amber-400 transition hover:text-amber-300"
        >
          ...more
        </button>
      )}
    </div>
  );
}

