"use client";

import { usePlayer } from "@/contexts/player-context";

function formatTimeDetailed(seconds: number): string {
  if (!isFinite(seconds)) return "00:00.000";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
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
  const bitrate = 128; // SoundCloud typical
  const sampleRate = "44.1 kHz";
  const codec = "MP3";

  return (
    <div className="w-full font-mono">
      {/* Error message - foobar2000 style */}
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

      {/* Main player container - foobar2000 style */}
      <div className="border border-neutral-700 bg-neutral-900 shadow-lg">
        {/* Top info bar */}
        <div className="border-b border-neutral-700 bg-neutral-800 px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-300">
            <div className="flex items-center gap-3">
              <span className="text-neutral-400">
                {isLoading ? "⏳" : isPaused ? "⏸" : "▶"}
              </span>
              <span className="font-semibold text-white">
                {currentItem.title}
              </span>
              <span className="text-neutral-500">•</span>
              <a
                href={currentItem.artistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white hover:underline"
              >
                {currentItem.artist}
              </a>
            </div>
            <div className="flex items-center gap-2 text-neutral-500">
              <span>{codec}</span>
              <span>|</span>
              <span>{bitrate} kbps</span>
              <span>|</span>
              <span>{sampleRate}</span>
            </div>
          </div>
        </div>

        {/* Controls section */}
        <div className="border-b border-neutral-700 bg-neutral-900 px-3 py-3">
          <div className="mb-3 flex items-center gap-2">
            {/* Transport controls */}
            <button
              onClick={previous}
              disabled={isLoading}
              className="flex h-7 w-8 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous"
              title="Previous track"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            
            <button
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              className="flex h-7 w-12 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="flex h-7 w-8 items-center justify-center border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next"
              title={queue.length === 0 ? "No tracks in queue" : "Next track"}
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Time display */}
            <div className="ml-4 flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="w-[72px] text-right tabular-nums">{formatTimeDetailed(currentTime)}</span>
              <span className="text-neutral-600">/</span>
              <span className="w-[72px] tabular-nums">{formatTimeDetailed(duration)}</span>
            </div>

            {/* Volume */}
            <div className="ml-auto flex items-center gap-2">
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
              <span className="w-8 text-right text-[11px] text-neutral-500 tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Seekbar */}
          <div className="relative">
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
        </div>

        {/* Queue section */}
        {queue.length > 0 && (
          <div className="border-b border-neutral-700 bg-neutral-900 px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold text-neutral-400">
              QUEUE ({queue.length} {queue.length === 1 ? "track" : "tracks"})
            </div>
            <div className="max-h-24 space-y-1 overflow-y-auto text-[11px] text-neutral-500">
              {queue.slice(0, 5).map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 truncate hover:text-neutral-300">
                  <span className="w-6 text-right text-neutral-600 tabular-nums">{idx + 1}.</span>
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-neutral-600">-</span>
                  <span className="text-neutral-600">{item.artist}</span>
                </div>
              ))}
              {queue.length > 5 && (
                <div className="text-neutral-600">
                  ... and {queue.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="bg-neutral-800 px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-500">
            <div className="flex items-center gap-3">
              <span>Status: {isLoading ? "Loading..." : error ? "Error" : isPaused ? "Paused" : "Playing"}</span>
              <span className="text-neutral-700">|</span>
              <span>Type: {currentItem.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-600">Powered by</span>
              <a
                href="https://soundcloud.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500/70 hover:text-orange-400"
              >
                SoundCloud
              </a>
              <span className="text-neutral-700">|</span>
              <a
                href={currentItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-400 hover:underline"
              >
                View Original
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

