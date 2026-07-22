import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistRow } from "@/components/browse/artist-row";
import { BrowseHeader } from "@/components/browse/browse-header";
import { EntityHero } from "@/components/browse/entity-hero";
import { IntersectionList, RelatedChips } from "@/components/browse/sidebar-sections";
import { resolveRoster } from "@/lib/browse/resolve-artists";
import { getCityDetail, listCities } from "@/lib/browse/store";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listCities().map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityDetail(slug);
  if (!city) return {};
  return {
    title: `${city.name} — SoundGround`,
    description: `${city.name}: ${city.artistCount} artists mapped by connection in the underground atlas.`,
  };
}

export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  const city = getCityDetail(slug);
  if (!city) {
    notFound();
  }

  const roster = await resolveRoster(city.roster);

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader breadcrumb={`City / ${city.name}`} />
      <EntityHero
        kicker={city.countryCode ? `City · ${city.countryCode}` : "City"}
        name={city.name}
        activity={city.activity}
        activeNow={city.activeNow}
        stats={`${city.artistCount} artists${city.topGenre ? ` · ${city.topGenre} is strongest here` : ""}`}
        playScope={{ city: city.slug }}
      />

      <div className="flex flex-col gap-8 border-t border-sg-line px-5 pb-28 pt-4 sm:px-10 lg:flex-row lg:gap-12">
        <div className="lg:flex-[1.7]">
          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
              Artists here
            </div>
            <div className="font-sg-mono text-[10.5px] text-sg-faint">
              ranked by reach &amp; impact
            </div>
          </div>
          {roster.map((artist, index) => (
            <ArtistRow key={artist.urn} rank={index + 1} artist={artist} />
          ))}
        </div>

        <aside className="flex flex-col gap-8 pt-6 lg:flex-1">
          {city.genres.length > 0 && (
            <IntersectionList
              heading="Genres here"
              items={city.genres.map((genre) => ({
                label: genre.name,
                suffix: `in ${city.name} · ${genre.count}`,
                href: `/genre/${genre.slug}`,
              }))}
            />
          )}
          {city.otherCities.length > 0 && (
            <RelatedChips
              heading="Other cities"
              items={city.otherCities.map((other) => ({
                label: other.name,
                href: `/city/${other.slug}`,
              }))}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
