import Link from "next/link";
import Image from "next/image";
import type { PresenceChip, ArtistConnection } from "@/lib/browse/artist-context";
import type { ResolvedRosterArtist } from "@/lib/browse/resolve-artists";
import type { SoundCloudPlaylist } from "@/lib/soundcloud/client";
import { TrackPlayButton, type PlayableTrack } from "./track-play-button";

function SectionHeading({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="border-b border-sg-line pb-2.5">
      <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
        {children}
      </div>
      {note && <div className="mt-1 font-sg-mono text-[10px] text-sg-faint">{note}</div>}
    </div>
  );
}

/** "Appears in" — the artist's coordinates in the atlas, chip-linked. */
export function AppearsIn({ chips }: { chips: readonly PresenceChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div>
      <SectionHeading>Appears in</SectionHeading>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={`${chip.kind}:${chip.slug}`}
            href={`/${chip.kind}/${chip.slug}`}
            className="border border-sg-line-strong px-3 py-[7px] font-sg-mono text-[11px] text-sg-soft transition-colors hover:border-sg-ink hover:text-white"
          >
            {chip.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** "Releases" — albums as compact rows, playable. */
export function ReleasesList({
  albums,
  trackFor,
}: {
  albums: readonly SoundCloudPlaylist[];
  trackFor: (album: SoundCloudPlaylist) => PlayableTrack | null;
}) {
  if (albums.length === 0) return null;
  return (
    <div>
      <SectionHeading>Releases</SectionHeading>
      {albums.map((album) => {
        const playable = trackFor(album);
        // Albums without their own artwork borrow the first track's.
        const artwork = album.artwork_url ?? album.tracks?.find((t) => t.artwork_url)?.artwork_url;
        return (
          <div
            key={album.id}
            className="flex items-center gap-3.5 border-b border-sg-line-faint py-2.5"
          >
            {artwork ? (
              <Image
                src={artwork}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 flex-none border border-white/[0.06] object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="h-11 w-11 flex-none border border-white/[0.06]"
                style={{
                  background: "repeating-linear-gradient(45deg,#181818 0 5px,#101010 5px 10px)",
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-sg text-[15px] text-sg-ink">{album.title}</div>
              <div className="mt-0.5 font-sg-mono text-[10.5px] text-sg-dim">
                {(album.set_type || "LP").toUpperCase()} · {album.track_count} tracks
                {album.created_at ? ` · ${new Date(album.created_at).getFullYear()}` : ""}
              </div>
            </div>
            {playable && <TrackPlayButton track={playable} size={30} />}
          </div>
        );
      })}
    </div>
  );
}

/** "Strongest connections" — the graph ties that rank this artist elsewhere. */
export function ConnectionsList({
  connections,
  resolved,
}: {
  connections: readonly ArtistConnection[];
  resolved: readonly ResolvedRosterArtist[];
}) {
  if (connections.length === 0) return null;
  const byUrn = new Map(resolved.map((artist) => [artist.urn, artist]));
  return (
    <div>
      <SectionHeading note="real follows · reposts">Strongest connections</SectionHeading>
      {connections.map((connection) => {
        const artist = byUrn.get(connection.urn);
        const name = artist?.displayName ?? connection.permalink ?? null;
        if (!name) return null;
        const row = (
          <div className="flex items-center gap-3 py-2">
            {artist?.avatarUrl ? (
              <Image
                src={artist.avatarUrl}
                alt=""
                width={34}
                height={34}
                className="h-[34px] w-[34px] flex-none rounded-full border border-white/[0.06] object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="h-[34px] w-[34px] flex-none rounded-full border border-white/[0.06]"
                style={{
                  background: "repeating-linear-gradient(45deg,#181818 0 5px,#101010 5px 10px)",
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-sg text-sm text-sg-ink">{name}</div>
              <div className="mt-px font-sg-mono text-[10px] text-sg-dim">{connection.context}</div>
            </div>
          </div>
        );
        return artist?.profileHref ? (
          <Link key={connection.urn} href={artist.profileHref} className="block hover:bg-sg-surface">
            {row}
          </Link>
        ) : (
          <div key={connection.urn}>{row}</div>
        );
      })}
    </div>
  );
}
