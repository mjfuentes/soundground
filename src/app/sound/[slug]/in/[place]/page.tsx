import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistRow } from "@/components/browse/artist-row";
import { BrowseHeader } from "@/components/browse/browse-header";
import { EntityHero } from "@/components/browse/entity-hero";
import { IntersectionList } from "@/components/browse/sidebar-sections";
import { resolveRoster } from "@/lib/browse/resolve-artists";
import { getSoundInPlace } from "@/lib/browse/store";

// Rendered on demand (no build-time enumeration of every sound×place pair),
// then ISR-cached like the other browse surfaces.
export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string; place: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, place } = await params;
  const detail = getSoundInPlace(slug, place);
  if (!detail) return {};
  return {
    title: `${detail.genreName} in ${detail.cityName} — SoundGround`,
    description: `${detail.genreName} in ${detail.cityName}: ${detail.artistCount} artists in the underground atlas.`,
  };
}

export default async function SoundInPlacePage({ params }: PageProps) {
  const { slug, place } = await params;
  const detail = getSoundInPlace(slug, place);
  if (!detail) {
    notFound();
  }

  const roster = await resolveRoster(detail.roster);
  const hubs = await resolveRoster(detail.hubs);

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader breadcrumb={`Sound / ${detail.genreName} / ${detail.cityName}`} />
      <EntityHero
        kicker={`Sound · in ${detail.cityName}`}
        name={`${detail.genreName} in ${detail.cityName}`}
        activity={null}
        activeNow={false}
        stats={`${detail.artistCount} artists${detail.hubCount > 0 ? ` + ${detail.hubCount} label${detail.hubCount === 1 ? "" : "s"}` : ""}`}
        playScope={{ genre: detail.genreSlug, city: detail.citySlug }}
      />

      <div className="flex flex-col gap-8 border-t border-sg-line px-5 pb-28 pt-4 sm:px-10 lg:flex-row lg:gap-12">
        <div className="lg:flex-[1.7]">
          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
              Artists
            </div>
            <div className="font-sg-mono text-[10.5px] text-sg-faint">
              ranked by reach &amp; impact
            </div>
          </div>
          {roster.map((artist, index) => (
            <ArtistRow key={artist.urn} rank={index + 1} artist={artist} within={detail.genreSlug} />
          ))}

          {hubs.length > 0 && (
            <>
              <div className="mb-2 mt-10 flex items-baseline justify-between">
                <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
                  Labels &amp; hubs
                </div>
                <div className="font-sg-mono text-[10.5px] text-sg-faint">
                  the institutions here
                </div>
              </div>
              {hubs.map((hub, index) => (
                <ArtistRow key={hub.urn} rank={index + 1} artist={hub} within={detail.genreSlug} />
              ))}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-8 pt-6 lg:flex-1">
          <IntersectionList
            heading="Zoom out"
            items={[
              {
                label: `All of ${detail.genreName}`,
                href: `/sound/${detail.genreSlug}`,
              },
              {
                label: `All of ${detail.cityName}`,
                href: `/place/${detail.citySlug}`,
              },
            ]}
          />
        </aside>
      </div>
    </main>
  );
}
