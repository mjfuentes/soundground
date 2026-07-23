import Image from "next/image";
import { ActivityDot } from "@/components/browse/activity-dot";
import { PlayButton } from "@/components/browse/play-button";
import type { SoundCloudUser } from "@/lib/soundcloud/client";

interface ArtistHeroProps {
  profile: SoundCloudUser;
  /** From the latest observed upload; null hides the line's dot. */
  activeNow: boolean;
}

/** Left-column identity block: avatar, name, SC backlink, location, bio, play CTA. */
export function ArtistHero({ profile, activeNow }: ArtistHeroProps) {
  const location = [profile.city, profile.country_code].filter(Boolean).join(" · ");
  const avatarXl = profile.avatar_url?.replace("-large", "-t500x500");

  return (
    <div>
      {avatarXl ? (
        <Image
          src={avatarXl}
          alt=""
          width={320}
          height={320}
          className="mb-5 aspect-square w-full border border-white/[0.08] object-cover"
          priority
        />
      ) : (
        <div
          aria-hidden
          className="mb-5 aspect-square w-full border border-white/[0.08]"
          style={{ background: "repeating-linear-gradient(45deg,#181818 0 6px,#101010 6px 12px)" }}
        />
      )}
      <div className="flex items-center gap-3">
        <h1 className="m-0 font-sg text-[40px] font-extrabold leading-none tracking-[-0.02em] text-sg-ink">
          {profile.username}
        </h1>
        {/* SoundCloud attribution backlink (API ToU) */}
        <a
          href={profile.permalink_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sg-mono text-xs text-sg-dim hover:text-white"
          title="Open on SoundCloud"
        >
          ↗ SC
        </a>
      </div>
      {(activeNow || location) && (
        <div className="mt-2.5 flex items-center gap-2.5 font-sg-mono text-[11px] tracking-[0.06em] text-sg-muted">
          {activeNow && (
            <span className="flex items-center gap-1.5">
              <ActivityDot size={5} />
              active now
            </span>
          )}
          {location && <span>{activeNow ? `· ${location}` : location}</span>}
        </div>
      )}
      {profile.description && (
        <p className="mb-0 mt-4 line-clamp-6 whitespace-pre-line font-sg text-[15px] leading-relaxed text-sg-body">
          {profile.description}
        </p>
      )}
      <div className="mt-5">
        <PlayButton scope={{ artist: profile.id }} label="everything" variant="cta" />
      </div>
    </div>
  );
}
