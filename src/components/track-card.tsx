import Image from "next/image";
import Link from "next/link";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

interface TrackCardProps {
  track: SoundCloudTrack;
  showStats?: boolean;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TrackCard({ track, showStats = true }: TrackCardProps) {
  return (
    <Link
      href={track.permalink_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-purple-500/50 hover:bg-purple-500/10"
    >
      {/* Album Art */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gradient-to-br from-purple-500/20 to-purple-600/20">
        {track.artwork_url ? (
          <Image
            src={track.artwork_url.replace("large.jpg", "t200x200.jpg")}
            alt={track.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-purple-400/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div>
          <h4 className="truncate text-sm font-medium text-white group-hover:text-purple-400">
            {track.title}
          </h4>
          <p className="text-xs text-zinc-400">
            {formatDuration(track.duration)}
            {track.genre && ` • ${track.genre}`}
          </p>
        </div>

        {showStats && (
          <div className="flex gap-3 text-xs text-zinc-400">
            {track.playback_count !== undefined && (
              <span className="flex items-center gap-1" title="Plays">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {formatNumber(track.playback_count)}
              </span>
            )}
            {track.likes_count !== undefined && (
              <span className="flex items-center gap-1" title="Likes">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {formatNumber(track.likes_count)}
              </span>
            )}
            {track.reposts_count !== undefined && track.reposts_count > 0 && (
              <span className="flex items-center gap-1" title="Reposts">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
                {formatNumber(track.reposts_count)}
              </span>
            )}
            {track.comment_count !== undefined && track.comment_count > 0 && (
              <span className="flex items-center gap-1" title="Comments">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                </svg>
                {formatNumber(track.comment_count)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

