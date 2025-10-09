"use client";

import { usePlayer } from "@/contexts/player-context";
import Image from "next/image";
import Link from "next/link";

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CustomAudioPlayer() {
  const {
    currentItem,
    isPaused,
    isLoading,
    currentTime,
    duration,
    volume,
    error,
    pause,
    resume,
    seek,
    setVolume,
    queue,
    next,
    previous,
  } = usePlayer();

  if (!currentItem) {
    return null;
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const togglePlayPause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full font-mono">
      {/* Error message */}
      {error && (
        <div className="mb-2 border border-red-800 bg-red-950/80 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-red-300">{error}</p>
            {error.includes("SoundCloud") && currentItem && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 border border-orange-600 bg-orange-900/50 px-2 py-1 text-xs text-orange-300 hover:bg-orange-900"
              >
                Open in SoundCloud
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main player container */}
      <div className="bg-neutral-900">
        {/* Album Art + Track Info + Description */}
        <div className="flex items-start gap-3 border-b border-neutral-700 bg-neutral-900 px-3 py-3">
          {/* Large Album Art - 160px */}
          <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden border border-neutral-600 bg-neutral-950">
            {currentItem.artwork ? (
              <Image
                src={currentItem.artwork}
                alt={currentItem.title}
                fill
                className="object-cover"
                sizes="160px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg className="h-16 w-16 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Track info and controls */}
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            {/* Track info */}
            <div className="min-w-0">
              <Link
                href={`/track/${currentItem.id}`}
                className="truncate text-base font-semibold text-white hover:text-neutral-300 block cursor-pointer"
              >
                {currentItem.title}
              </Link>
              <Link
                href={`/${currentItem.artistUrl.split('/').pop()}`}
                className="mt-1 block truncate text-sm text-neutral-400 hover:text-white hover:underline"
              >
                {currentItem.artist}
              </Link>
            </div>

            {/* Transport controls at bottom - small */}
            <div className="mt-4 flex items-center gap-1">
              <button
                onClick={previous}
                disabled={isLoading}
                className="flex h-7 w-7 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous"
                title="Previous track"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              
              <button
                onClick={togglePlayPause}
                disabled={isLoading || !!error}
                className="flex h-7 w-9 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                )}
              </button>

              <button
                onClick={next}
                disabled={queue.length === 0 || isLoading}
                className="flex h-7 w-7 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next"
                title={queue.length === 0 ? "No tracks in queue" : "Next track"}
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Description in remaining space */}
          {currentItem.description && (
            <div className="hidden min-w-0 flex-1 overflow-y-auto py-1 pr-2 lg:block">
              <div className="text-xs text-neutral-400">
                <div className="whitespace-pre-wrap break-words">
                  {currentItem.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seekbar */}
        <div className="border-b border-neutral-700 bg-neutral-900 px-4 py-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={!duration || isLoading}
            className="h-5 w-full cursor-pointer appearance-none bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-500 [&::-webkit-slider-thumb]:bg-neutral-600 [&::-webkit-slider-thumb]:hover:bg-neutral-500 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-500 [&::-moz-range-thumb]:bg-neutral-600 [&::-moz-range-thumb]:hover:bg-neutral-500"
            style={{
              background: `linear-gradient(to right, rgb(82 82 82) 0%, rgb(82 82 82) ${progressPercent}%, rgb(38 38 38) ${progressPercent}%, rgb(38 38 38) 100%)`,
            }}
          />
        </div>

        {/* Time and Volume */}
        <div className="flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-4 py-2">
          {/* Time display */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span className="text-neutral-600">/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              className="text-neutral-400 hover:text-neutral-200"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
              title={`Volume: ${Math.round(volume * 100)}%`}
            >
              {volume > 0.5 ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ) : volume > 0 ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 9v6h4l5 5V4L9 9H5z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="h-1 w-20 cursor-pointer appearance-none bg-neutral-700 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-neutral-400 [&::-webkit-slider-thumb]:hover:bg-neutral-200 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-400 [&::-moz-range-thumb]:hover:bg-neutral-200"
              style={{
                background: `linear-gradient(to right, rgb(163 163 163) 0%, rgb(163 163 163) ${volume * 100}%, rgb(64 64 64) ${volume * 100}%, rgb(64 64 64) 100%)`,
              }}
              aria-label="Volume"
            />
            <span className="w-8 text-right text-[10px] text-neutral-500 tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Next Track section */}
        {queue.length > 0 && (
          <div className="bg-neutral-900 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500">Next:</span>
              <div className="flex items-center gap-2">
                {queue[0].artwork && (
                  <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden border border-neutral-600 bg-neutral-950">
                    <Image
                      src={queue[0].artwork}
                      alt={queue[0].title}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-neutral-300">{queue[0].title}</div>
                  <div className="truncate text-[10px] text-neutral-600">{queue[0].artist}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

