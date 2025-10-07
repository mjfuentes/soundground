import Image from "next/image";
import Link from "next/link";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";

interface AlbumCardProps {
  album: SoundCloudPlaylist;
  showStats?: boolean;
}

function formatNumber(num?: number): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function AlbumCard({ album, showStats = true }: AlbumCardProps) {
  return (
    <Link
      href={album.permalink_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5 transition">
        {album.artwork_url ? (
          <Image
            src={album.artwork_url.replace("large.jpg", "t500x500.jpg")}
            alt={album.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-12 w-12 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="line-clamp-1 text-sm font-medium text-white group-hover:text-purple-400">
          {album.title}
        </h4>
        <p className="text-xs text-zinc-400">{album.track_count} tracks</p>
        {showStats && (
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            {album.playback_count !== undefined && album.playback_count > 0 && (
              <span className="flex items-center gap-1" title="Plays">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {formatNumber(album.playback_count)}
              </span>
            )}
            {album.likes_count !== undefined && album.likes_count > 0 && (
              <span className="flex items-center gap-1" title="Likes">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {formatNumber(album.likes_count)}
              </span>
            )}
            {album.reposts_count !== undefined && album.reposts_count > 0 && (
              <span className="flex items-center gap-1" title="Reposts">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
                {formatNumber(album.reposts_count)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

