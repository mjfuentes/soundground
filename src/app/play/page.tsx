"use client";

import { usePlayer } from "@/contexts/player-context";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect, Suspense } from "react";

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

function NowPlayingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpen = searchParams.get("auto") === "true";
  
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

  // Redirect back if no track is playing and not auto-opened
  useEffect(() => {
    if (!currentItem && !isPlaying && !autoOpen) {
      router.back();
    }
  }, [currentItem, isPlaying, autoOpen, router]);

  const togglePlayPause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleMinimize = () => {
    router.back();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "Escape") {
        router.back();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (isPaused) {
          resume();
        } else {
          pause();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (duration > 0) {
          seek(Math.min(currentTime + 10, duration));
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(currentTime - 10, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, duration, isPaused, pause, resume, seek, router]);

  if (!currentItem) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#060606' }}>
        <div className="text-neutral-500">No track playing</div>
      </div>
    );
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleClose = () => {
    stop();
    router.back();
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get high quality artwork URL (replace large with t500x500)
  const highQualityArtwork = currentItem.artwork?.replace(/large\.jpg/, 't500x500.jpg') || currentItem.artwork;

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-neutral-950 via-black to-black">
      {/* Header with minimize/close controls */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-6">
        <button
          onClick={handleMinimize}
          className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-white"
          aria-label="Minimize"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm">Minimize</span>
        </button>
        
        <button
          onClick={handleClose}
          className="text-neutral-400 transition-colors hover:text-white"
          aria-label="Close and stop playback"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center px-8 pb-32 pt-20">
        <div className="w-full max-w-2xl">
          {/* Album Art - Large and centered at top */}
          <div className="relative mx-auto mb-8 aspect-square w-full max-w-sm overflow-hidden rounded-lg shadow-2xl">
            {highQualityArtwork ? (
              <Image
                src={highQualityArtwork}
                alt={currentItem.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 384px"
                priority
                quality={100}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                <svg className="h-32 w-32 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center">
            <h1 className="mb-3 text-3xl font-light tracking-tight text-white md:text-4xl">
              {currentItem.title}
            </h1>
            <a
              href={currentItem.artistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-lg text-neutral-400 transition-colors hover:text-white md:text-xl"
            >
              {currentItem.artist}
            </a>
          </div>

          {/* Description - Always visible if exists */}
          {currentItem.description && (
            <div className="mt-8 max-h-64 overflow-y-auto rounded-lg bg-neutral-900/50 p-6 backdrop-blur-sm">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400 font-light italic">
                {currentItem.description}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-6 rounded-lg border border-red-800/50 bg-red-950/30 px-6 py-4">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm text-red-300">{error}</p>
                {error.includes("SoundCloud") && currentItem && (
                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-red-600/50 bg-red-900/50 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-900"
                  >
                    Open in SoundCloud
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Controls - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent px-8 pb-8 pt-16">
        <div className="mx-auto max-w-2xl">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="group relative">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                disabled={!duration || isLoading}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30 
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-opacity group-hover:[&::-webkit-slider-thumb]:opacity-100
                  [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:opacity-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-opacity group-hover:[&::-moz-range-thumb]:opacity-100"
                style={{
                  background: `linear-gradient(to right, rgb(255 255 255) 0%, rgb(255 255 255) ${progressPercent}%, rgb(38 38 38) ${progressPercent}%, rgb(38 38 38) 100%)`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm tabular-nums text-neutral-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="mb-6 flex items-center justify-center gap-6">
            <button
              onClick={previous}
              disabled={isLoading}
              className="text-neutral-400 transition-all hover:scale-110 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous"
            >
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? (
                <svg className="ml-1 h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            <button
              onClick={next}
              disabled={queue.length === 0 || isLoading}
              className="text-neutral-400 transition-all hover:scale-110 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next"
            >
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              className="text-neutral-400 transition-colors hover:text-white"
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
            <div className="w-32 group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-800
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:transition-opacity group-hover:[&::-webkit-slider-thumb]:opacity-100
                  [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:opacity-0 [&::-moz-range-thumb]:transition-opacity group-hover:[&::-moz-range-thumb]:opacity-100"
                style={{
                  background: `linear-gradient(to right, rgb(163 163 163) 0%, rgb(163 163 163) ${volume * 100}%, rgb(38 38 38) ${volume * 100}%, rgb(38 38 38) 100%)`,
                }}
                aria-label="Volume"
              />
            </div>
            <span className="w-10 text-sm tabular-nums text-neutral-500">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Queue info */}
          {queue.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
              <span>Next:</span>
              <span className="text-neutral-400">{queue[0].title}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-500">{queue.length} in queue</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NowPlayingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#060606' }}>
        <div className="text-neutral-500">Loading...</div>
      </div>
    }>
      <NowPlayingContent />
    </Suspense>
  );
}

