"use client";

import { usePlayer } from "@/contexts/player-context";
import { CustomAudioPlayer } from "./custom-audio-player";
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
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative flex items-center gap-3 border border-neutral-600 bg-neutral-900 px-4 py-2 font-mono text-xs shadow-xl hover:border-neutral-500 hover:bg-neutral-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">▶</span>
            <span className="max-w-[200px] truncate text-neutral-300">
              {currentItem.title}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              stop();
            }}
            className="border border-neutral-600 bg-neutral-800 px-2 py-1 text-neutral-400 hover:bg-neutral-700 hover:text-red-400"
            title="Stop"
          >
            ✕
          </button>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Main player container - foobar2000 style */}
      <div className="border-t-2 border-neutral-700 bg-neutral-900 shadow-2xl">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Header bar */}
          <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
              <span className="font-semibold text-neutral-300">foobar2000</span>
              <span className="text-neutral-700">|</span>
              <span>CloudMate Player</span>
            </div>
            
            {/* Window controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="flex h-6 w-6 items-center justify-center border border-neutral-600 bg-neutral-800 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-white"
                title="Minimize"
              >
                _
              </button>
              <button
                onClick={stop}
                className="flex h-6 w-6 items-center justify-center border border-neutral-600 bg-neutral-800 text-xs text-neutral-400 hover:bg-red-900 hover:text-red-300"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Audio Player */}
          <div className="w-full">
            <CustomAudioPlayer />
          </div>

          {/* Footer hint */}
          <div className="mt-2 border-t border-neutral-800 pt-2 text-center font-mono text-[10px] text-neutral-600">
            Press <kbd className="border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-neutral-500">ESC</kbd> to close player
          </div>
        </div>
      </div>
    </div>
  );
}

