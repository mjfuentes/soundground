import Image from "next/image";
import Link from "next/link";
import { formatCount } from "@/lib/browse/format";
import type { ResolvedRosterArtist } from "@/lib/browse/resolve-artists";
import { urnToId } from "@/lib/soundcloud/official-client";
import { CoverTile } from "./cover-art";
import { PlayButton } from "./play-button";

interface ArtistRowProps {
  rank: number;
  artist: ResolvedRosterArtist;
  /** Sound-page context: play only this artist's tracks in that sound. */
  within?: string;
}

/** Ranked roster row shared by the sound, place, and circle pages. */
export function ArtistRow({ rank, artist, within }: ArtistRowProps) {
  const context = [artist.cityRaw, artist.otherGenres.length > 0 ? `also in ${artist.otherGenres.join(", ")}` : null]
    .filter(Boolean)
    .join(" · ");

  const row = (
    <div className="group flex items-center gap-3 border-b border-sg-line-soft py-[15px] transition-colors hover:bg-sg-surface sm:gap-[18px]">
      <div className="w-[22px] flex-none font-sg-mono text-xs text-sg-faint">
        {String(rank).padStart(2, "0")}
      </div>
      {artist.avatarUrl ? (
        <Image
          src={artist.avatarUrl}
          alt=""
          width={46}
          height={46}
          className="h-[46px] w-[46px] flex-none border border-white/[0.06] object-cover"
        />
      ) : (
        <CoverTile className="flex-none" />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-sg text-lg font-semibold tracking-[-0.01em] text-sg-ink">
          {artist.displayName}
        </div>
        {context && (
          <div className="mt-[3px] truncate font-sg-mono text-[10.5px] text-sg-dim">{context}</div>
        )}
      </div>
      <div className="flex-none text-right font-sg-mono text-[11px] leading-tight text-sg-muted">
        {formatCount(artist.followers)}
        <br />
        <span className="text-[10px] text-sg-faint">followers</span>
      </div>
      {artist.plays > 0 && (
        <div className="hidden w-[66px] flex-none text-right font-sg-mono text-[11px] leading-tight text-sg-muted sm:block">
          {formatCount(artist.plays)}
          <br />
          <span className="text-[10px] text-sg-faint">plays</span>
        </div>
      )}
      <PlayButton
        scope={{ artist: urnToId(artist.urn), within }}
        label={artist.displayName}
        size={38}
      />
    </div>
  );

  return artist.profileHref ? <Link href={artist.profileHref}>{row}</Link> : row;
}
