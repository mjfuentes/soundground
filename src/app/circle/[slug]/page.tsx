import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistRow } from "@/components/browse/artist-row";
import { BrowseHeader } from "@/components/browse/browse-header";
import { EntityHero } from "@/components/browse/entity-hero";
import { IntersectionList, RelatedChips } from "@/components/browse/sidebar-sections";
import { resolveRoster } from "@/lib/browse/resolve-artists";
import { getSceneDetail, listScenes } from "@/lib/browse/scene-store";
import { slugify } from "@/lib/browse/slug";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listScenes().map((scene) => ({ slug: scene.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const scene = getSceneDetail(slug);
  if (!scene) return {};
  return {
    title: `${scene.name} — SoundGround`,
    description: `${scene.name}: a scene of ${scene.memberCount} connected artists detected in the underground atlas.`,
  };
}

export default async function ScenePage({ params }: PageProps) {
  const { slug } = await params;
  const scene = getSceneDetail(slug);
  if (!scene) {
    notFound();
  }

  const roster = await resolveRoster(scene.roster);
  const hubs = await resolveRoster(scene.hubs);
  // Tags link into genre pages when the genre actually exists as a page.
  const genreSlugs = new Set(scene.genres.map((genre) => genre.slug));

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader breadcrumb={`Circle / ${scene.name}`} />
      <EntityHero
        kicker="Circle"
        name={scene.name}
        activity={scene.activity}
        activeNow={scene.activeNow}
        stats={`${scene.memberCount} artists mapped${scene.cityName ? ` · centered in ${scene.cityName}` : ""}`}
        playScope={{ scene: scene.slug }}
      />

      <div className="flex flex-col gap-8 border-t border-sg-line px-5 pb-28 pt-4 sm:px-10 lg:flex-row lg:gap-12">
        <div className="lg:flex-[1.7]">
          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <div className="font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
              Artists
            </div>
            <div className="font-sg-mono text-[10.5px] text-sg-faint">
              ranked by connections inside this scene — not global reach
            </div>
          </div>
          {roster.map((artist, index) => (
            <ArtistRow key={artist.urn} rank={index + 1} artist={artist} />
          ))}
        </div>

        <aside className="flex flex-col gap-8 pt-6 lg:flex-1">
          {scene.tags.length > 0 && (
            <RelatedChips
              heading="How this circle tags itself"
              items={scene.tags.map((tag) => {
                const tagSlug = slugify(tag);
                return {
                  label: tag,
                  href: genreSlugs.has(tagSlug) ? `/sound/${tagSlug}` : undefined,
                };
              })}
            />
          )}
          {hubs.length > 0 && (
            <IntersectionList
              heading="Hubs & labels"
              items={hubs.map((hub) => ({
                label: hub.displayName,
                href: hub.profileHref ?? undefined,
              }))}
            />
          )}
          {scene.genres.length > 0 && (
            <IntersectionList
              heading="Sounds in this circle"
              items={scene.genres.map((genre) => ({
                label: genre.name,
                suffix: `${genre.count}`,
                href: `/sound/${genre.slug}`,
              }))}
            />
          )}
          {scene.cities.length > 0 && (
            <IntersectionList
              heading="Where its artists are"
              items={scene.cities.map((city) => ({
                label: city.name,
                suffix: `${city.count}`,
                href: `/place/${city.slug}`,
              }))}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
