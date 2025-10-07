"use client";

import { usePlayer } from "@/contexts/player-context";
import { SoundcloudEmbed } from "./soundcloud-embed";
import { useState, useEffect } from "react";

export function FloatingPlayer() {
  const { currentItem, isPlaying, stop } = usePlayer();
  const [isMinimized, setIsMinimized] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stop]);

  if (!isPlaying || !currentItem) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative flex items-center gap-3 rounded-full border border-purple-500/30 bg-zinc-950/95 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-purple-500/20 transition hover:border-purple-500/50 hover:shadow-purple-500/30"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-purple-500" />
            <span className="text-sm font-medium text-white max-w-[200px] truncate">
              {currentItem.title}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stop();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-500/20 hover:text-red-400"
              title="Stop"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Gradient overlay at top of player for visual separation */}
      <div className="fixed bottom-[280px] left-0 right-0 z-40 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
        
        {/* Main player container */}
        <div className="relative border-t border-purple-500/20 bg-gradient-to-b from-zinc-950/98 to-black/98 backdrop-blur-2xl shadow-[0_-10px_40px_-10px_rgba(168,85,247,0.15)]">
          <div className="mx-auto max-w-7xl px-4 py-5">
            {/* Header with title and controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Now playing indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-0.5">
                    <div className="h-4 w-1 animate-sound-wave bg-purple-500 rounded-full" style={{ animationDelay: "0ms" }} />
                    <div className="h-4 w-1 animate-sound-wave bg-purple-500 rounded-full" style={{ animationDelay: "150ms" }} />
                    <div className="h-4 w-1 animate-sound-wave bg-purple-500 rounded-full" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="truncate text-base font-semibold text-white mb-0.5">
                    {currentItem.title}
                  </h4>
                  <p className="text-xs text-purple-400/80 capitalize font-medium">
                    Now Playing • {currentItem.type}
                  </p>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white hover:scale-105"
                  title="Minimize player"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={stop}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-red-500/20 hover:text-red-400 hover:scale-105"
                  title="Close player"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Embedded Player */}
            <div className="w-full">
              <SoundcloudEmbed url={currentItem.url} autoPlay={true} />
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="mt-3 text-center text-xs text-zinc-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">Esc</kbd> to close
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

