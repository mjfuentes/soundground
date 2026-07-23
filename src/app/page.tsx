import { ActivityDot } from "@/components/browse/activity-dot";
import { BrowseHeader } from "@/components/browse/browse-header";
import { CityCard } from "@/components/browse/city-card";
import { GenreCard } from "@/components/browse/genre-card";
import { HomeSearch } from "@/components/browse/home-search";
import { SceneCard } from "@/components/browse/scene-card";
import { ShowMore } from "@/components/browse/show-more";
import { peekAvatarMap, resolveAvatarMap } from "@/lib/browse/resolve-artists";
import { listScenes } from "@/lib/browse/scene-store";
import { getBrowseStatus, listCities, listGenres } from "@/lib/browse/store";

export const revalidate = 3600;

/** Cards shown before "show more"; only these get live-resolved cover art. */
const TOP_SCENES = 6;
const TOP_GENRES = 12;
const TOP_CITIES = 9;
/**
 * Cap on "show more" cards per section. Every rest card ships in the page
 * payload (ShowMore is a client component), so 500+ hidden card subtrees
 * make the home multi-megabyte. The long tail stays reachable via search
 * quick-jumps and cross-links.
 */
const REST_CAP = 30;

function SectionRule({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between border-b border-sg-line pb-3.5 font-sg-mono text-[11px] uppercase tracking-[0.18em]">
      <span className="text-sg-muted">{title}</span>
      {hint ? <span className="normal-case tracking-normal text-sg-faint">{hint}</span> : null}
    </div>
  );
}

function StillCrawling() {
  return (
    <div className="border border-sg-line bg-sg-surface px-6 py-16 text-center">
      <div className="font-sg text-2xl font-semibold text-sg-ink">The atlas is still crawling</div>
      <p className="mx-auto mt-3 max-w-md font-sg-mono text-xs leading-relaxed text-sg-dim">
        No aggregated scene data yet. Run <span className="text-sg-soft">npm run crawl</span> and
        then <span className="text-sg-soft">npm run aggregate</span> to map the first orbit.
      </p>
    </div>
  );
}

export default async function Home() {
  const status = getBrowseStatus();
  const scenes = listScenes();
  const genres = listGenres();
  const cities = listCities();
  const topScenes = scenes.slice(0, TOP_SCENES);
  const restScenes = scenes.slice(TOP_SCENES, TOP_SCENES + REST_CAP);
  const topGenres = genres.slice(0, TOP_GENRES);
  const restGenres = genres.slice(TOP_GENRES, TOP_GENRES + REST_CAP);
  const topCities = cities.slice(0, TOP_CITIES);
  const restCities = cities.slice(TOP_CITIES, TOP_CITIES + REST_CAP);
  // One urn group per card: the resolver round-robins its API budget across
  // groups so every mosaic gets its top members first.
  const avatars = await resolveAvatarMap([
    ...topScenes.map((scene) => scene.coverUrns),
    ...topGenres.map((genre) => genre.coverUrns),
    ...topCities.map((city) => city.coverUrns),
  ]);
  // "Show more" cards get cache-only avatars: thousands of cells, zero API.
  const restAvatars = peekAvatarMap([
    ...restScenes.flatMap((scene) => scene.coverUrns),
    ...restGenres.flatMap((genre) => genre.coverUrns),
    ...restCities.flatMap((city) => city.coverUrns),
  ]);
  const coversFor = (urns: readonly string[]) => urns.map((urn) => avatars.get(urn) ?? null);
  const cachedCoversFor = (urns: readonly string[]) =>
    urns.map((urn) => restAvatars.get(urn) ?? null);

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader
        countsLine={
          status.hasData
            ? [
                status.sceneCount > 0 ? `${status.sceneCount} circles` : null,
                `${status.genreCount} sounds`,
                `${status.cityCount} places`,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
      />
      <HomeSearch />

      <div className="px-5 pb-28 pt-7 sm:px-7">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="m-0 font-sg text-3xl font-bold tracking-[-0.02em] text-sg-ink sm:text-[40px]">
            Browse the underground
          </h1>
          {status.hasData && (
            <div className="flex items-center gap-2 font-sg-mono text-[11px] uppercase tracking-[0.1em] text-sg-dim">
              <ActivityDot />
              from the artist graph
            </div>
          )}
        </div>

        {!status.hasData && <StillCrawling />}

        {scenes.length > 0 && (
          <section id="scenes" className="mb-11 scroll-mt-24">
            <SectionRule title="Circles" hint="who actually runs together — detected in the graph, not tags" />
            <ShowMore
              gridClassName="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
              label="scenes"
              restCount={restScenes.length}
              preview={topScenes.map((scene) => (
                <SceneCard key={scene.slug} scene={scene} coverUrls={coversFor(scene.coverUrns)} />
              ))}
              rest={restScenes.map((scene) => (
                <SceneCard key={scene.slug} scene={scene} coverUrls={cachedCoversFor(scene.coverUrns)} />
              ))}
            />
          </section>
        )}

        {genres.length > 0 && (
          <section id="genres" className="mb-11 scroll-mt-24">
            <SectionRule title="Sounds" hint="as the scene tags itself" />
            <ShowMore
              gridClassName="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
              label="genres"
              restCount={restGenres.length}
              preview={topGenres.map((genre) => (
                <GenreCard key={genre.slug} genre={genre} coverUrls={coversFor(genre.coverUrns)} />
              ))}
              rest={restGenres.map((genre) => (
                <GenreCard key={genre.slug} genre={genre} coverUrls={cachedCoversFor(genre.coverUrns)} />
              ))}
            />
          </section>
        )}

        {cities.length > 0 && (
          <section id="cities" className="scroll-mt-24">
            <SectionRule title="Places — listen to a place" hint="self-declared locations" />
            <ShowMore
              gridClassName="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
              label="cities"
              restCount={restCities.length}
              preview={topCities.map((city) => (
                <CityCard key={city.slug} city={city} coverUrls={coversFor(city.coverUrns)} />
              ))}
              rest={restCities.map((city) => (
                <CityCard key={city.slug} city={city} coverUrls={cachedCoversFor(city.coverUrns)} />
              ))}
            />
          </section>
        )}
      </div>
    </main>
  );
}
