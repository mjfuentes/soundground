import Image from "next/image";
import { formatCount, formatDuration, formatRelativeTime } from "@/lib/browse/format";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";
import { TrackPlayButton, type PlayableTrack } from "./track-play-button";

export function toPlayable(track: SoundCloudTrack): PlayableTrack {
  return {
    id: track.id,
    url: track.permalink_url,
    title: track.title,
    artist: track.user?.username ?? "",
    artistUrl: track.user?.permalink_url ?? "",
    artwork: track.artwork_url,
    type: "track",
  };
}

function Artwork({ url, size }: { url?: string; size: number }) {
  return url ? (
    <Image
      src={url}
      alt=""
      width={size}
      height={size}
      className="flex-none border border-white/[0.06] object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      aria-hidden
      className="flex-none border border-white/[0.06]"
      style={{
        width: size,
        height: size,
        background: "repeating-linear-gradient(45deg,#181818 0 5px,#101010 5px 10px)",
      }}
    />
  );
}

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 border-b border-sg-line pb-2.5 font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
      {children}
    </div>
  );
}

/**
 * "Most played" — the design's Spotlight slot, filled honestly: the
 * official API exposes no artist-pinned spotlight, so the three most
 * played uploads stand in.
 */
export function SpotlightGrid({ tracks }: { tracks: readonly SoundCloudTrack[] }) {
  if (tracks.length === 0) return null;
  const queue = tracks.map(toPlayable);
  return (
    <div>
      <SectionRule>Most played</SectionRule>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {tracks.slice(0, 3).map((track) => (
          <div key={track.id} className="border border-sg-line bg-sg-surface">
            <div className="relative aspect-square">
              <Artwork url={track.artwork_url?.replace("-large", "-t300x300")} size={300} />
              <div className="absolute bottom-3 left-3">
                <TrackPlayButton track={toPlayable(track)} queue={queue} size={40} variant="solid" />
              </div>
              <span className="absolute bottom-2.5 right-2.5 font-sg-mono text-[10px] text-sg-soft">
                {formatDuration(track.duration)}
              </span>
            </div>
            <div className="px-3.5 py-3">
              <div className="truncate font-sg text-[15px] font-semibold text-sg-ink">
                {track.title}
              </div>
              {track.genre && (
                <div className="mt-1 font-sg-mono text-[10.5px] text-sg-dim">{track.genre}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Recent uploads" — the track list, each row playable in context. */
export function UploadsList({ tracks }: { tracks: readonly SoundCloudTrack[] }) {
  if (tracks.length === 0) return null;
  const queue = tracks.map(toPlayable);
  return (
    <div>
      <SectionRule>Recent uploads</SectionRule>
      {tracks.map((track) => (
        <div
          key={track.id}
          className="flex items-center gap-4 border-b border-sg-line-soft py-[15px] transition-colors hover:bg-sg-surface"
        >
          <Artwork url={track.artwork_url} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-sg text-[17px] font-semibold tracking-[-0.01em] text-sg-ink">
              {track.title}
            </div>
            <div className="mt-[3px] font-sg-mono text-[10.5px] text-sg-dim">
              {track.created_at ? `uploaded ${formatRelativeTime(track.created_at)}` : ""}
              {track.genre ? ` · ${track.genre}` : ""}
            </div>
          </div>
          {(track.playback_count ?? 0) > 0 && (
            <div className="flex-none text-right font-sg-mono text-[11px] leading-tight text-sg-muted">
              {formatCount(track.playback_count!)}
              <br />
              <span className="text-[10px] text-sg-faint">plays</span>
            </div>
          )}
          <span className="w-11 flex-none text-right font-sg-mono text-[11px] text-sg-dim">
            {formatDuration(track.duration)}
          </span>
          <TrackPlayButton track={toPlayable(track)} queue={queue} />
        </div>
      ))}
    </div>
  );
}

/** "Recent shares" — what this artist reposts (their curation taste). */
export function SharesGrid({ reposts }: { reposts: readonly SoundCloudTrack[] }) {
  if (reposts.length === 0) return null;
  const queue = reposts.map(toPlayable);
  return (
    <div>
      <SectionRule>Recent shares — reposts</SectionRule>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {reposts.slice(0, 6).map((track) => (
          <div key={track.id} className="border border-sg-line bg-sg-surface p-3.5">
            <div className="flex items-center gap-3">
              <Artwork url={track.artwork_url} size={48} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 truncate font-sg-mono text-[10px] text-sg-dim">
                  ↻ shared from {track.user?.username ?? "?"}
                </div>
                <div className="truncate font-sg text-sm font-semibold leading-tight text-sg-ink">
                  {track.title}
                </div>
              </div>
              <TrackPlayButton track={toPlayable(track)} queue={queue} size={30} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
