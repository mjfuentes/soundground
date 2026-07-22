import Link from "next/link";
import type { CitySummary } from "@/lib/browse/types";
import { CoverStrip } from "./cover-art";
import { PlayButton } from "./play-button";

interface CityCardProps {
  city: CitySummary;
  /** Avatar URLs for the cover wall, aligned with city.coverUrns. */
  coverUrls?: readonly (string | null)[];
}

export function CityCard({ city, coverUrls = [] }: CityCardProps) {
  return (
    <Link
      href={`/place/${city.slug}`}
      className="group flex flex-col gap-3.5 border border-sg-line bg-sg-surface p-4 transition-colors hover:border-sg-line-strong hover:bg-sg-raised"
    >
      <CoverStrip imageUrls={coverUrls} />
      <div className="flex items-end justify-between">
        <div>
          <div className="font-sg text-[22px] font-semibold tracking-[-0.01em] text-sg-ink">
            {city.name}
          </div>
          <div className="mt-1 font-sg-mono text-[11px] text-sg-dim">
            {city.country ? `${city.country} · ` : ""}
            {city.artistCount} artists
          </div>
        </div>
        <PlayButton scope={{ city: city.slug }} label={city.name} />
      </div>
      {city.topGenre && (
        <div className="font-sg-mono text-[10.5px] text-sg-faint">
          ↳ {city.topGenre} is strongest here
        </div>
      )}
    </Link>
  );
}
