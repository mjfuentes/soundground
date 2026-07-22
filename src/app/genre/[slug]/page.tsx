import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistRow } from "@/components/browse/artist-row";
import { BrowseHeader } from "@/components/browse/browse-header";
import { EntityHero } from "@/components/browse/entity-hero";
import { IntersectionList, RelatedChips } from "@/components/browse/sidebar-sections";
import { resolveRoster } from "@/lib/browse/resolve-artists";
import { getGenreDetail, listGenres } from "@/lib/browse/store";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listGenres().map((genre) => ({ slug: genre.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenreDetail(slug);
  if (!genre) return {};
  return {
    title: `${genre.name} — SoundGround`,
    description: `${genre.name}: ${genre.artistCount} artists mapped by connection in the underground atlas.`,
  };
}

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params;
  const genre = getGenreDetail(slug);
  if (!genre) {
    notFound();
  }

  const roster = await resolveRoster(genre.roster);

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader breadcrumb={`Genre / ${genre.name}`} />
      <EntityHero
        kicker="Genre"
        name={genre.name}
        activity={genre.activity}
        activeNow={genre.activeNow}
        stats={`${genre.artistCount} artists${genre.topCity ? ` · strongest in ${genre.topCity}` : ""}`}
        playScope={{ genre: genre.slug }}
      />

      <div className="flex flex-col gap-8 border-t border-sg-line px-5 pb-28 pt-4 sm:px-10 lg:flex-row lg:gap-12">
        <div className="lg:flex-[1.7]">
          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
              Artists
            </div>
            <div className="font-sg-mono text-[10.5px] text-sg-faint">
              ranked by reach &amp; impact · previewing artists rooted here
            </div>
          </div>
          {roster.map((artist, index) => (
            <ArtistRow key={artist.urn} rank={index + 1} artist={artist} />
          ))}
        </div>

        <aside className="flex flex-col gap-8 pt-6 lg:flex-1">
          {genre.cities.length > 0 && (
            <IntersectionList
              heading="Strongest in these cities"
              items={genre.cities.map((city) => ({
                label: `${genre.name} in ${city.name}`,
                suffix: `${city.count}`,
                href: `/city/${city.slug}`,
              }))}
            />
          )}
          {genre.related.length > 0 && (
            <RelatedChips
              heading="Related genres"
              items={genre.related.map((related) => ({
                label: related.name,
                href: `/genre/${related.slug}`,
              }))}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
