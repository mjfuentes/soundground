"use client";

import { usePlayer } from "@/contexts/player-context";

export interface PlayableTrack {
  id: number;
  url: string;
  title: string;
  artist: string;
  artistUrl: string;
  artwork?: string;
  type: "track";
}

interface TrackPlayButtonProps {
  track: PlayableTrack;
  /** Full list the track sits in; playing starts the queue at this track. */
  queue?: readonly PlayableTrack[];
  size?: number;
  variant?: "outline" | "solid";
}

/** Plays one track (with its surrounding list as the queue) in the shared player. */
export function TrackPlayButton({ track, queue, size = 38, variant = "outline" }: TrackPlayButtonProps) {
  const { playQueue } = usePlayer();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const items = queue && queue.length > 0 ? queue : [track];
    const start = Math.max(0, items.findIndex((item) => item.id === track.id));
    playQueue([...items.slice(start), ...items.slice(0, start)], false);
  };

  const solid = variant === "solid";
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Play ${track.title}`}
      className={
        solid
          ? "flex flex-none cursor-pointer items-center justify-center rounded-full bg-sg-ink pl-[2px] text-[11px] text-[#060606] hover:bg-white"
          : "flex flex-none cursor-pointer items-center justify-center rounded-full border border-sg-line-bold pl-[2px] text-[10px] text-sg-ink transition-colors hover:border-sg-ink hover:bg-sg-ink hover:text-[#060606]"
      }
      style={{ width: size, height: size }}
    >
      ▶
    </button>
  );
}
