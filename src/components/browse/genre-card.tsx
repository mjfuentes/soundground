import Link from "next/link";
import type { GenreSummary } from "@/lib/browse/types";
import { ActivityDot } from "./activity-dot";
import { CoverTile } from "./cover-art";
import { PlayButton } from "./play-button";

interface GenreCardProps {
  genre: GenreSummary;
  /** Avatar URLs for the cover tiles, aligned with genre.coverUrns. */
  coverUrls?: readonly (string | null)[];
}

export function GenreCard({ genre, coverUrls = [] }: GenreCardProps) {
  return (
    <Link
      href={`/sound/${genre.slug}`}
      className="group flex flex-col gap-3.5 border border-sg-line bg-sg-surface p-4 transition-colors hover:border-sg-line-strong hover:bg-sg-raised"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-1">
          <CoverTile imageUrl={coverUrls[0]} />
          <CoverTile imageUrl={coverUrls[1]} />
          <CoverTile imageUrl={coverUrls[2]} className="hidden xs:block" />
        </div>
        <PlayButton scope={{ genre: genre.slug }} label={genre.name} />
      </div>
      <div>
        <div className="font-sg text-[22px] font-semibold tracking-[-0.01em] text-sg-ink">
          {genre.name}
        </div>
        {genre.relatedNames.length > 0 && (
          <div className="mt-1.5 font-sg-mono text-[11px] leading-[1.4] text-sg-dim">
            with {genre.relatedNames.join(" · ")}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-sg-line-soft pt-3">
        <span className="font-sg-mono text-[11px] text-sg-muted">
          {genre.artistCount} artists
        </span>
        {genre.activity && (
          <span className="flex items-center gap-1.5 font-sg-mono text-[10.5px] tracking-[0.06em] text-sg-muted">
            {genre.activeNow && <ActivityDot size={5} />}
            {genre.activity}
          </span>
        )}
      </div>
      {genre.topCity && (
        <div className="font-sg-mono text-[10.5px] tracking-[0.02em] text-sg-faint">
          ↳ strongest in {genre.topCity}
        </div>
      )}
    </Link>
  );
}
