"use client";

import { usePlayer } from "@/contexts/player-context";
import Image from "next/image";

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
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
    setVolume(newVolume); // Now expects 0-100
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
    <div className="w-full">
      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-400">{error}</p>
            {error.includes("SoundCloud") && currentItem && (
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-600"
              >
                Open in SoundCloud
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main player container */}
      <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-zinc-900/95 to-black/95 shadow-2xl shadow-purple-500/10">
        {/* Background artwork blur */}
        {currentItem.artwork && (
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <Image
              src={currentItem.artwork}
              alt=""
              fill
              className="scale-110 object-cover blur-2xl"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="relative p-4">
          {/* Track info with artwork */}
          <div className="mb-4 flex items-center gap-4">
            {/* Artwork */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 shadow-lg">
              {currentItem.artwork ? (
                <Image
                  src={currentItem.artwork}
                  alt={currentItem.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-8 w-8 text-purple-400/50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Track details */}
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-base font-semibold text-white">
                {currentItem.title}
              </h3>
              <a
                href={currentItem.artistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 hover:underline"
              >
                {currentItem.artist}
              </a>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex-shrink-0">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="group relative">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                disabled={!duration || isLoading}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:transition-all group-hover:[&::-webkit-slider-thumb]:h-4 group-hover:[&::-webkit-slider-thumb]:w-4 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:transition-all group-hover:[&::-moz-range-thumb]:h-4 group-hover:[&::-moz-range-thumb]:w-4"
                style={{
                  background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:bg-purple-600 hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            {/* Volume control */}
            <div className="flex flex-1 items-center gap-2">
              <button
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                className="flex-shrink-0 text-zinc-400 transition hover:text-white"
                aria-label={volume > 0 ? "Mute" : "Unmute"}
              >
                {volume > 0.5 ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                ) : volume > 0 ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
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
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 transition-all hover:bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:h-3.5 hover:[&::-webkit-slider-thumb]:w-3.5 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-all hover:[&::-moz-range-thumb]:h-3.5 hover:[&::-moz-range-thumb]:w-3.5"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
                aria-label="Volume"
              />
              <span className="w-10 flex-shrink-0 text-right text-xs text-zinc-400">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* SoundCloud attribution - Required by API Terms */}
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Powered by</span>
              <a
                href="https://soundcloud.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-orange-400 transition hover:text-orange-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-1.712-1.304-3.106-2.911-3.106-.384 0-.751.072-1.092.201l-.118.09zm-9.879.696v8.285h1v-9.533c-.298.548-.568 1.174-.684 1.856l-.316-.608z" />
                </svg>
                SoundCloud
              </a>
            </div>
            <a
              href={currentItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 transition hover:text-purple-300 hover:underline"
            >
              View on SoundCloud →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

