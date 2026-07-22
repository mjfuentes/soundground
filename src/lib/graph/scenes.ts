/**
 * Scene engine orchestrator (ideas/0004 A1+A2+A4): graph.db edges →
 * hub-discounted symmetrized weights → Louvain communities → within-scene
 * ranking → c-TF-IDF names → persisted `scenes` + `scene_members` with
 * IDs stable across runs. Pure computation over SQLite — zero API calls.
 */

import type { Database } from "better-sqlite3";
import type { RosterEntry } from "@/lib/browse/aggregate";
import { EMPTY_ACCOUNT_CANON, type AccountCanon } from "@/lib/browse/canon";
import { foldTerm, mostFrequent, slugify, titleCase } from "@/lib/browse/slug";
import { classifyHubs } from "./hubs";
import {
  DEFAULT_COMMUNITY_CONFIG,
  buildSceneGraph,
  detectCommunities,
  type CommunityConfig,
  type PartitionStats,
} from "./communities";
import {
  DEFAULT_EDGE_WEIGHT_CONFIG,
  directedStrengths,
  loadDirectedPairs,
  repostHubFactors,
  symmetrize,
  type EdgeWeightConfig,
} from "./edge-weights";
import { DEFAULT_IDENTITY_CONFIG, matchSceneIds, type IdentityConfig } from "./scene-identity";
import {
  DEFAULT_SCENE_NAMING_CONFIG,
  displayFromSpellings,
  nameScenes,
  type SceneDoc,
  type SceneNamingConfig,
} from "./scene-naming";

export interface SceneComputeConfig {
  edgeWeights: EdgeWeightConfig;
  community: CommunityConfig;
  naming: SceneNamingConfig;
  identity: IdentityConfig;
  rosterSize: number;
}

/** Hubs shown per scene ("Hubs & labels" strip). */
const HUBS_PER_SCENE = 6;

export const DEFAULT_SCENE_COMPUTE_CONFIG: SceneComputeConfig = {
  edgeWeights: DEFAULT_EDGE_WEIGHT_CONFIG,
  community: DEFAULT_COMMUNITY_CONFIG,
  naming: DEFAULT_SCENE_NAMING_CONFIG,
  identity: DEFAULT_IDENTITY_CONFIG,
  rosterSize: 15,
};

export interface ScenePreview {
  id: number;
  name: string | null;
  slug: string | null;
  memberCount: number;
  totalCount: number;
  cityName: string | null;
  tags: string[];
}

export interface SceneComputeReport {
  scenes: number;
  named: number;
  unnamed: number;
  unclusteredNodes: number;
  resolution: number;
  sweep: PartitionStats[];
  subClustered: number;
  /** Named scenes by crawled-member count, for the CLI. */
  largest: ScenePreview[];
  unnamedScenes: ScenePreview[];
}

interface ArtistRow {
  urn: string;
  permalink: string | null;
  city_raw: string | null;
  last_upload_at: string | null;
  track_count: number | null;
  followers_count: number | null;
  plays_total: number | null;
  likes_total: number | null;
  comments_total: number | null;
  crawled: number;
}

const hasTable = (db: Database, name: string): boolean =>
  (db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = ?`).get(name) as { n: number })
    .n > 0;

/** Previous run's membership, for stable-ID matching. */
function loadPreviousMembership(db: Database): Map<number, Set<string>> {
  const rows = db
    .prepare(`SELECT scene_id, artist_urn FROM scene_members`)
    .all() as { scene_id: number; artist_urn: string }[];
  const previous = new Map<number, Set<string>>();
  for (const row of rows) {
    const members = previous.get(row.scene_id) ?? new Set<string>();
    members.add(row.artist_urn);
    previous.set(row.scene_id, members);
  }
  return previous;
}

/**
 * Within-scene weighted in-degree (ideas/0004 A4): the sum of hub-discounted
 * directed strengths a member receives from co-members. Honest under a
 * partial crawl and immune to London/LA hub gravity — global followers
 * never enter the ranking.
 */
function inSceneDegrees(
  strengths: ReadonlyMap<string, ReadonlyMap<string, number>>,
  clusterOf: ReadonlyMap<string, number>,
): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const [src, byDst] of strengths) {
    const srcCluster = clusterOf.get(src);
    if (srcCluster === undefined) continue;
    for (const [dst, strength] of byDst) {
      if (clusterOf.get(dst) === srcCluster) {
        degrees.set(dst, (degrees.get(dst) ?? 0) + strength);
      }
    }
  }
  return degrees;
}

interface CityLookup {
  cityOf: Map<string, string>; // urn -> city slug
  nameOf: Map<string, string>; // city slug -> display name
}

/** City assignments come from the aggregation pass when it has run. */
function loadCities(db: Database): CityLookup {
  if (!hasTable(db, "artist_cities") || !hasTable(db, "browse_cities")) {
    return { cityOf: new Map(), nameOf: new Map() };
  }
  const memberships = db
    .prepare(`SELECT artist_urn, city_slug FROM artist_cities`)
    .all() as { artist_urn: string; city_slug: string }[];
  const names = db.prepare(`SELECT slug, name FROM browse_cities`).all() as {
    slug: string;
    name: string;
  }[];
  return {
    cityOf: new Map(memberships.map((m) => [m.artist_urn, m.city_slug])),
    nameOf: new Map(names.map((n) => [n.slug, n.name])),
  };
}

function loadGenresOfArtists(db: Database): Map<string, string[]> {
  if (!hasTable(db, "artist_genres")) return new Map();
  const rows = db
    .prepare(
      `SELECT artist_urn, genre_slug FROM artist_genres ORDER BY evidence DESC, genre_slug`,
    )
    .all() as { artist_urn: string; genre_slug: string }[];
  const genres = new Map<string, string[]>();
  for (const row of rows) {
    const list = genres.get(row.artist_urn) ?? [];
    if (list.length < 3) list.push(row.genre_slug);
    genres.set(row.artist_urn, list);
  }
  return genres;
}

interface TermRow {
  artist_urn: string;
  term: string;
  kind: "genre" | "tag";
  evidence: number;
}

interface SceneTermData {
  docs: SceneDoc[];
  display: (term: string) => string;
}

/**
 * Build one c-TF-IDF document per cluster: folded member terms, weighted by
 * evidence × the member's within-scene in-degree (falling back to plain
 * evidence for clusters whose terms all sit on zero-degree members).
 * Hub accounts' terms are excluded entirely — a radio show's episode
 * metadata is not the scene's self-description.
 */
function buildSceneDocs(
  terms: readonly TermRow[],
  clusters: readonly (readonly string[])[],
  clusterOf: ReadonlyMap<string, number>,
  degrees: ReadonlyMap<string, number>,
  cities: CityLookup,
  hubs: ReadonlySet<string>,
): SceneTermData {
  const spellingCounts = new Map<string, Map<string, number>>();
  const weighted = clusters.map(() => new Map<string, number>());
  const unweighted = clusters.map(() => new Map<string, number>());
  const supportSets = clusters.map(() => new Map<string, Set<string>>());
  const termedMembers = clusters.map(() => new Set<string>());

  for (const row of terms) {
    const cluster = clusterOf.get(row.artist_urn);
    if (cluster === undefined || hubs.has(row.artist_urn)) continue;
    const key = foldTerm(row.term);
    if (!key) continue;

    const spellings = spellingCounts.get(key) ?? new Map<string, number>();
    spellings.set(row.term, (spellings.get(row.term) ?? 0) + (row.kind === "genre" ? 2 : 1));
    spellingCounts.set(key, spellings);

    const degree = degrees.get(row.artist_urn) ?? 0;
    weighted[cluster].set(key, (weighted[cluster].get(key) ?? 0) + row.evidence * degree);
    unweighted[cluster].set(key, (unweighted[cluster].get(key) ?? 0) + row.evidence);
    const carriers = supportSets[cluster].get(key) ?? new Set<string>();
    carriers.add(row.artist_urn);
    supportSets[cluster].set(key, carriers);
    termedMembers[cluster].add(row.artist_urn);
  }

  const docs = clusters.map((cluster, index): SceneDoc => {
    const hasWeight = [...weighted[index].values()].some((w) => w > 0);
    const cityCounts = new Map<string, number>();
    let located = 0;
    for (const urn of cluster) {
      const citySlug = cities.cityOf.get(urn);
      if (!citySlug) continue;
      located += 1;
      cityCounts.set(citySlug, (cityCounts.get(citySlug) ?? 0) + 1);
    }
    const topCitySlug = mostFrequent(cityCounts);
    const topCity =
      topCitySlug && located > 0
        ? {
            name: cities.nameOf.get(topCitySlug) ?? titleCase(topCitySlug),
            share: (cityCounts.get(topCitySlug) ?? 0) / located,
            locatedMembers: located,
          }
        : null;
    return {
      key: index,
      termWeights: hasWeight ? weighted[index] : unweighted[index],
      termSupport: new Map(
        [...supportSets[index].entries()].map(([term, carriers]) => [term, carriers.size]),
      ),
      termedMembers: termedMembers[index].size,
      topCity,
    };
  });

  const displaySpellings = new Map<string, string>(
    [...spellingCounts.entries()].map(([key, spellings]) => [
      key,
      titleCase(mostFrequent(spellings) ?? key),
    ]),
  );
  return { docs, display: displayFromSpellings(displaySpellings) };
}

/** Roster: members by within-scene in-degree; zero-track accounts excluded. */
function buildRoster(
  cluster: readonly string[],
  degrees: ReadonlyMap<string, number>,
  artists: ReadonlyMap<string, ArtistRow>,
  genresOf: ReadonlyMap<string, string[]>,
  rosterSize: number,
): RosterEntry[] {
  return [...cluster]
    .filter((urn) => (artists.get(urn)?.track_count ?? 1) !== 0)
    .sort(
      (a, b) => (degrees.get(b) ?? 0) - (degrees.get(a) ?? 0) || a.localeCompare(b),
    )
    .slice(0, rosterSize)
    .map((urn) => {
      const artist = artists.get(urn);
      return {
        urn,
        permalink: artist?.permalink ?? null,
        cityRaw: artist?.city_raw ?? null,
        connections: Math.round((degrees.get(urn) ?? 0) * 10) / 10,
        followers: artist?.followers_count ?? 0,
        plays: artist?.plays_total ?? 0,
        likes: artist?.likes_total ?? 0,
        comments: artist?.comments_total ?? 0,
        trackCount: artist?.track_count ?? null,
        lastUploadAt: artist?.last_upload_at ?? null,
        otherGenres: genresOf.get(urn) ?? [],
      };
    });
}

/** Unique slugs among named scenes; collisions get the stable ID appended. */
export function assignSlugs(
  names: readonly { id: number; name: string | null }[],
): Map<number, string | null> {
  const used = new Set<string>();
  const slugs = new Map<number, string | null>();
  for (const { id, name } of names) {
    if (!name) {
      slugs.set(id, null);
      continue;
    }
    // The suffixed fallback can itself collide (a scene literally named
    // "Techno 5" vs the fifth "Techno") — keep incrementing until unused.
    const base = slugify(name);
    let slug = base;
    for (let suffix = id; used.has(slug); suffix += 1) {
      slug = `${base}-${suffix}`;
    }
    used.add(slug);
    slugs.set(id, slug);
  }
  return slugs;
}

export function computeScenes(
  db: Database,
  config: SceneComputeConfig = DEFAULT_SCENE_COMPUTE_CONFIG,
  now: () => string = () => new Date().toISOString(),
  accountCanon: AccountCanon = EMPTY_ACCOUNT_CANON,
): SceneComputeReport {
  // 1. Weights (B1): discounted directed strengths, symmetrized.
  const pairs = loadDirectedPairs(db);
  const factors = repostHubFactors(pairs, config.edgeWeights);
  const strengths = directedStrengths(pairs, factors);
  const edges = symmetrize(strengths);

  // Crawled artists are the "measured" population: sub-clustering limits
  // apply to them, never to the uncrawled frontier padding.
  const crawledUrns = new Set(
    (
      db.prepare(`SELECT urn FROM artists WHERE last_crawled_at IS NOT NULL`).all() as {
        urn: string;
      }[]
    ).map((row) => row.urn),
  );

  // 2. Communities (A1).
  const partition = detectCommunities(buildSceneGraph(edges), config.community, (node) =>
    crawledUrns.has(node),
  );
  const clusterOf = new Map<string, number>();
  partition.scenes.forEach((cluster, index) => {
    for (const urn of cluster) clusterOf.set(urn, index);
  });

  // 3. Within-scene ranking (A4).
  const degrees = inSceneDegrees(strengths, clusterOf);

  // 4. Context: artists, terms, cities, genres.
  const artistRows = db
    .prepare(
      `SELECT urn, permalink, city_raw, last_upload_at, track_count, followers_count,
              plays_total, likes_total, comments_total,
              (last_crawled_at IS NOT NULL) AS crawled
       FROM artists`,
    )
    .all() as ArtistRow[];
  const artists = new Map(artistRows.map((row) => [row.urn, row]));
  const termRows = db
    .prepare(`SELECT artist_urn, term, kind, evidence FROM artist_terms`)
    .all() as TermRow[];
  const cities = loadCities(db);
  const genresOf = loadGenresOfArtists(db);

  // Hubs (B4): labels/radios/promo — clustered with everyone (real glue),
  // but out of artist rosters and out of the naming vocabulary.
  const hubSet = classifyHubs(
    artistRows.map((row) => ({
      urn: row.urn,
      permalink: row.permalink,
      trackCount: row.track_count,
    })),
    accountCanon,
  );

  // 5. Names (A2).
  const { docs, display } = buildSceneDocs(
    termRows,
    partition.scenes,
    clusterOf,
    degrees,
    cities,
    hubSet,
  );
  // A hub's name is an address, not a sound: fold every classified hub's
  // permalink — and every canon-listed one, present in the graph or not
  // (members tag "NTS Radio" even when NTS has no account here) — and keep
  // those terms out of scene vocabulary entirely.
  // City names are excluded from the sound vocabulary outright: a place
  // may only name a circle via the located-member prefix rule (structural
  // evidence), never via tag votes ("amsterdam" the tag). Multi-word forms
  // like "detroit techno" fold differently and survive.
  const cityFolds = new Set<string>();
  if (hasTable(db, "browse_cities")) {
    const cityRows = db.prepare(`SELECT slug, name FROM browse_cities`).all() as {
      slug: string;
      name: string;
    }[];
    for (const row of cityRows) {
      cityFolds.add(foldTerm(row.name));
      cityFolds.add(foldTerm(row.slug));
    }
  }
  // Countries too ("Brazil" the tag) — the artists table holds the full
  // country names the API supplies, so the list is data-driven.
  const countryRows = db
    .prepare(`SELECT DISTINCT country_code FROM artists WHERE country_code IS NOT NULL`)
    .all() as { country_code: string }[];
  for (const row of countryRows) cityFolds.add(foldTerm(row.country_code));

  const hubNameFolds = new Set([
    ...[...hubSet].map((urn) => foldTerm(artists.get(urn)?.permalink ?? "")),
    ...[...accountCanon.hubPermalinks].map(foldTerm),
    ...accountCanon.hubTermFolds,
    ...cityFolds,
  ]);
  hubNameFolds.delete("");
  const names = nameScenes(docs, display, config.naming, hubNameFolds);

  // 6. Stable identity, then persist.
  const previous = loadPreviousMembership(db);
  const ids = matchSceneIds(previous, partition.scenes, config.identity);
  const idAndName = partition.scenes.map((_, index) => ({
    id: ids[index],
    name: names.get(index)?.name ?? null,
  }));
  const slugs = assignSlugs(idAndName);

  const previews: ScenePreview[] = partition.scenes.map((cluster, index) => {
    const doc = docs[index];
    // "N artists mapped" — crawled members that are actual artists, not hubs.
    const crawledCount = cluster.filter(
      (urn) => artists.get(urn)?.crawled === 1 && !hubSet.has(urn),
    ).length;
    return {
      id: ids[index],
      name: names.get(index)?.name ?? null,
      slug: slugs.get(ids[index]) ?? null,
      memberCount: crawledCount,
      totalCount: cluster.length,
      cityName:
        doc.topCity && doc.topCity.share >= config.naming.cityShareThreshold
          ? doc.topCity.name
          : null,
      tags: names.get(index)?.tags ?? [],
    };
  });

  const timestamp = now();
  db.transaction(() => {
    db.prepare(`DELETE FROM scene_members`).run();
    db.prepare(`DELETE FROM scenes`).run();
    const insertScene = db.prepare(
      `INSERT INTO scenes (id, slug, name, city_name, tags, member_count, total_count,
                           roster, hubs, resolution, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertMember = db.prepare(
      `INSERT INTO scene_members (scene_id, artist_urn, in_scene_degree) VALUES (?, ?, ?)`,
    );
    partition.scenes.forEach((cluster, index) => {
      const preview = previews[index];
      const artistPool = cluster.filter((urn) => !hubSet.has(urn));
      const hubPool = cluster.filter((urn) => hubSet.has(urn));
      insertScene.run(
        preview.id,
        preview.slug,
        preview.name,
        preview.cityName,
        JSON.stringify(preview.tags),
        preview.memberCount,
        preview.totalCount,
        JSON.stringify(
          buildRoster(artistPool, degrees, artists, genresOf, config.rosterSize),
        ),
        JSON.stringify(buildRoster(hubPool, degrees, artists, genresOf, HUBS_PER_SCENE)),
        partition.resolution,
        timestamp,
      );
      for (const urn of cluster) {
        insertMember.run(preview.id, urn, Math.round((degrees.get(urn) ?? 0) * 1000) / 1000);
      }
    });
  })();

  const named = previews.filter((preview) => preview.name !== null);
  return {
    scenes: previews.length,
    named: named.length,
    unnamed: previews.length - named.length,
    unclusteredNodes: partition.unclustered.length,
    resolution: partition.resolution,
    sweep: partition.sweep,
    subClustered: partition.subClustered,
    largest: [...named].sort((a, b) => b.memberCount - a.memberCount).slice(0, 20),
    unnamedScenes: previews.filter((preview) => preview.name === null),
  };
}
