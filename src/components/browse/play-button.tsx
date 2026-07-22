"use client";

import { useState } from "react";
import { usePlayer } from "@/contexts/player-context";

export interface PlayScope {
  genre?: string;
  city?: string;
  scene?: string;
  artist?: number;
  /** With artist: prefer tracks carrying this sound (its slug). */
  within?: string;
  /** With artist: prefer tracks carrying this circle's vocabulary (its slug). */
  withinCircle?: string;
}

interface PlayButtonProps {
  scope: PlayScope;
  /** Accessible + CTA label, e.g. "Dub Techno" or an artist name. */
  label: string;
  /** "hint" = round icon on cards/rows; "cta" = hero "Listen to" button. */
  variant?: "hint" | "cta";
  size?: number;
}

/**
 * Fetches a scene/artist queue and hands it to the shared player. Sits
 * inside card links, so it stops the navigation the wrapping <Link> would
 * otherwise perform.
 */
export function PlayButton({ scope, label, variant = "hint", size = 40 }: PlayButtonProps) {
  const { playQueue } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams();
      if (scope.genre) params.set("genre", scope.genre);
      if (scope.city) params.set("city", scope.city);
      if (scope.scene) params.set("scene", scope.scene);
      if (scope.artist) params.set("artist", String(scope.artist));
      if (scope.within) params.set("within", scope.within);
      if (scope.withinCircle) params.set("withinCircle", scope.withinCircle);
      const response = await fetch(`/api/browse/queue?${params}`);
      if (!response.ok) {
        throw new Error(`Queue request failed (${response.status})`);
      }
      const data = await response.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        playQueue(data.items, false);
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.error(`[browse] queue failed for ${label}:`, error);
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "cta") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex cursor-pointer items-center gap-3 bg-sg-ink px-5 py-3.5 font-sg-mono text-xs uppercase tracking-[0.14em] text-[#060606] transition-colors hover:bg-white disabled:opacity-70"
      >
        {isLoading ? "◌ Loading…" : failed ? "✕ Nothing playable" : `▶ Listen to ${label}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={`Play ${label}`}
      title={failed ? "Nothing playable found" : `Play ${label}`}
      className="flex flex-none cursor-pointer items-center justify-center rounded-full border border-sg-line-bold pl-[2px] text-[11px] text-sg-ink transition-colors hover:border-sg-ink hover:bg-sg-ink hover:text-[#060606] disabled:opacity-60"
      style={{ width: size, height: size }}
    >
      {isLoading ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent pr-[2px]" /> : "▶"}
    </button>
  );
}
