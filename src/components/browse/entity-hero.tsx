import { ActivityDot } from "./activity-dot";
import { PlayButton, type PlayScope } from "./play-button";

interface EntityHeroProps {
  kicker: string;
  name: string;
  /** Optional descriptive line under the name (e.g. a circle's "where it lives"). */
  tagline?: string;
  /** Derived activity line ("active now", "12 this week") or null to hide. */
  activity: string | null;
  activeNow: boolean;
  stats: string;
  playScope: PlayScope;
}

/** Shared hero for genre and city pages: kicker, display name, listen CTA, derived stats. */
export function EntityHero({
  kicker,
  name,
  tagline,
  activity,
  activeNow,
  stats,
  playScope,
}: EntityHeroProps) {
  return (
    <div className="px-5 pb-8 pt-10 sm:px-10 sm:pt-11">
      <div className="mb-3.5 font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-dim">
        {kicker}
      </div>
      <h1 className="mb-4 font-sg text-5xl font-extrabold leading-[0.95] tracking-[-0.03em] text-sg-ink sm:text-[64px]">
        {name}
      </h1>
      {tagline && (
        <div className="mb-4 -mt-1 font-sg text-lg font-medium tracking-[-0.01em] text-sg-muted">
          {tagline}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-5">
        <PlayButton scope={playScope} label={name} variant="cta" />
        {activity && (
          <span className="flex items-center gap-2 font-sg-mono text-[11px] tracking-[0.08em] text-sg-muted">
            {activeNow && <ActivityDot />}
            {activity}
          </span>
        )}
        <span className="font-sg-mono text-[11px] text-sg-dim">{stats}</span>
      </div>
    </div>
  );
}
