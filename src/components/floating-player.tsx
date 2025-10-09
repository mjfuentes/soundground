"use client";

import { usePlayer } from "@/contexts/player-context";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function FloatingPlayer() {
  const pathname = usePathname();
  
  const {
    currentItem,
    isPlaying,
    isPaused,
    isLoading,
    currentTime,
    duration,
    volume,
    error,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    queue,
    next,
    previous,
  } = usePlayer();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Escape") {
        stop();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault(); // Prevent page scroll
        if (isPaused) {
          resume();
        } else {
          pause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stop, isPaused, pause, resume]);

  // Don't show floating player on the full-screen player page
  if (pathname === "/play") {
    return null;
  }

  // Show player if there's a current item (whether playing or paused)
  if (!currentItem) {
    return null;
  }

  const togglePlayPause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950 shadow-2xl">
      <div className="flex h-16 items-center gap-3 px-4">
        {/* Album Art */}
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-neutral-900">
          {currentItem.artwork ? (
            <Image
              src={currentItem.artwork}
              alt={currentItem.title}
              fill
              className="object-cover"
              sizes="48px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-6 w-6 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="min-w-0 flex-1 max-w-xs">
          <Link
            href={`/track/${currentItem.id}`}
            className="truncate text-sm font-medium text-white hover:text-neutral-300 block cursor-pointer"
          >
            {currentItem.title}
          </Link>
          <Link
            href={`/track/${currentItem.id}`}
            className="truncate text-xs text-neutral-500 hover:text-neutral-300 block cursor-pointer"
          >
            {currentItem.artist}
          </Link>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={previous}
            disabled={isLoading}
            className="cursor-pointer text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-black hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? (
              <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            )}
          </button>

          <button
            onClick={next}
            disabled={queue.length === 0 || isLoading}
            className="cursor-pointer text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-xs text-neutral-500 tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 group">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={!duration || isLoading}
              className="w-full h-1 appearance-none bg-neutral-800 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity group-hover:[&::-webkit-slider-thumb]:opacity-100
                [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-moz-range-thumb]:transition-opacity group-hover:[&::-moz-range-thumb]:opacity-100"
              style={{
                background: `linear-gradient(to right, rgb(255 255 255) 0%, rgb(255 255 255) ${progressPercent}%, rgb(38 38 38) ${progressPercent}%, rgb(38 38 38) 100%)`,
              }}
            />
          </div>
          <span className="text-xs text-neutral-500 tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="cursor-pointer text-neutral-400 hover:text-white transition-colors"
            aria-label={volume > 0 ? "Mute" : "Unmute"}
          >
            {volume > 0.5 ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            ) : volume > 0 ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 9v6h4l5 5V4L9 9H5z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
          <div className="w-20 group">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1 appearance-none bg-neutral-800 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity group-hover:[&::-webkit-slider-thumb]:opacity-100
                [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-moz-range-thumb]:transition-opacity group-hover:[&::-moz-range-thumb]:opacity-100"
              style={{
                background: `linear-gradient(to right, rgb(255 255 255) 0%, rgb(255 255 255) ${volume * 100}%, rgb(38 38 38) ${volume * 100}%, rgb(38 38 38) 100%)`,
              }}
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={stop}
          className="cursor-pointer text-neutral-400 hover:text-white transition-colors"
          aria-label="Close player"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error message overlay */}
      {error && (
        <div className="absolute bottom-full left-0 right-0 border-t border-red-800 bg-red-950/95 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-red-300">{error}</p>
            {error.includes("SoundCloud") && currentItem && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 cursor-pointer rounded px-3 py-1 text-xs text-red-300 underline hover:text-white"
              >
                Open in SoundCloud
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

