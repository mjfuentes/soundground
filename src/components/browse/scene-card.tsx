import Link from "next/link";
import type { SceneSummary } from "@/lib/browse/types";
import { ActivityDot } from "./activity-dot";
import { CoverTile } from "./cover-art";
import { PlayButton } from "./play-button";

interface SceneCardProps {
  scene: SceneSummary;
  /** Avatar URLs for the cover tiles, aligned with scene.coverUrns. */
  coverUrls?: readonly (string | null)[];
}

export function SceneCard({ scene, coverUrls = [] }: SceneCardProps) {
  const tagLine = scene.tags.slice(0, 3).join(" · ");
  return (
    <Link
      href={`/circle/${scene.slug}`}
      className="group flex flex-col gap-3.5 border border-sg-line bg-sg-surface p-4 transition-colors hover:border-sg-line-strong hover:bg-sg-raised"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-1">
          <CoverTile imageUrl={coverUrls[0]} />
          <CoverTile imageUrl={coverUrls[1]} />
          <CoverTile imageUrl={coverUrls[2]} className="hidden xs:block" />
        </div>
        <PlayButton scope={{ scene: scene.slug }} label={scene.name} />
      </div>
      <div>
        <div className="font-sg text-[22px] font-semibold tracking-[-0.01em] text-sg-ink">
          {scene.name}
        </div>
        {tagLine && (
          <div className="mt-1.5 font-sg-mono text-[11px] leading-[1.4] text-sg-dim">{tagLine}</div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-sg-line-soft pt-3">
        <span className="font-sg-mono text-[11px] text-sg-muted">
          {scene.memberCount} artists mapped
        </span>
        {scene.activity && (
          <span className="flex items-center gap-1.5 font-sg-mono text-[10.5px] tracking-[0.06em] text-sg-muted">
            {scene.activeNow && <ActivityDot size={5} />}
            {scene.activity}
          </span>
        )}
      </div>
      {scene.cityName && (
        <div className="font-sg-mono text-[10.5px] tracking-[0.02em] text-sg-faint">
          ↳ centered in {scene.cityName}
        </div>
      )}
    </Link>
  );
}
