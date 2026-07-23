/**
 * Aggregation (ideas/0003 Phase 2): raw graph observations → browse_* tables.
 *
 * Fully data-driven: categories emerge from what artists themselves declared.
 * A term becomes a genre when enough distinct artists carry it in their
 * track `genre` field; a city becomes browsable when enough artists declare
 * it. Variant spellings merge mechanically via foldTerm ("dub techno" ==
 * "dubtechno"); the display name is the spelling the scene itself uses most.
 * Idempotent: drops and rebuilds all derived tables in one transaction.
 */

import type { Database } from "better-sqlite3";
import {
  EMPTY_ACCOUNT_CANON,
  EMPTY_CITY_CANON,
  type AccountCanon,
  type CityCanon,
} from "./canon";
import { isFormatTerm } from "./format-terms";
import { foldTerm, mostFrequent, slugify, titleCase } from "./slug";

export interface AggregateConfig {
  /** Distinct artists declaring a term as track genre for it to become a category. */
  minGenreArtists: number;
  /** Distinct artists declaring a city for it to become browsable. */
  minCityArtists: number;
  /** Tag-kind evidence needed for genre membership when the genre field doesn't say it. */
  minTagEvidence: number;
  rosterSize: number;
}

export const DEFAULT_AGGREGATE_CONFIG: AggregateConfig = {
  minGenreArtists: 5,
  minCityArtists: 2,
  minTagEvidence: 2,
  rosterSize: 24, // deep enough for the card cover mosaics (20 cells)
};

export interface AggregateReport {
  genres: number;
  cities: number;
  genreMemberships: number;
  cityMemberships: number;
  belowThresholdGenreTerms: { term: string; artists: number }[];
  belowThresholdCities: { city: string; artists: number }[];
  excludedGenreTerms: { term: string; artists: number; reason: "city" | "format" }[];
}

interface TermRow {
  artist_urn: string;
  term: string;
  kind: "genre" | "tag";
  evidence: number;
}

interface ArtistRow {
  urn: string;
  permalink: string | null;
  city_raw: string | null;
  country_code: string | null;
  last_upload_at: string | null;
  track_count: number | null;
  followers_count: number | null;
  plays_total: number | null;
  likes_total: number | null;
  comments_total: number | null;
  account_kind: string | null;
}

const DERIVED_SCHEMA = `
  DROP TABLE IF EXISTS artist_genres;
  DROP TABLE IF EXISTS artist_cities;
  DROP TABLE IF EXISTS browse_genres;
  DROP TABLE IF EXISTS browse_cities;
  DROP TABLE IF EXISTS browse_genre_city;
  DROP TABLE IF EXISTS browse_related_genres;
  DROP TABLE IF EXISTS browse_meta;

  CREATE TABLE artist_genres (
    artist_urn TEXT NOT NULL,
    genre_slug TEXT NOT NULL,
    evidence INTEGER NOT NULL,
    PRIMARY KEY (artist_urn, genre_slug)
  );
  CREATE INDEX idx_artist_genres_genre ON artist_genres (genre_slug);

  CREATE TABLE artist_cities (
    artist_urn TEXT NOT NULL,
    city_slug TEXT NOT NULL,
    PRIMARY KEY (artist_urn, city_slug)
  );
  CREATE INDEX idx_artist_cities_city ON artist_cities (city_slug);

  CREATE TABLE browse_genres (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    artist_count INTEGER NOT NULL,
    top_city_slug TEXT,
    top_terms TEXT NOT NULL,
    roster TEXT NOT NULL,
    hub_count INTEGER NOT NULL DEFAULT 0,
    hub_roster TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE browse_cities (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    artist_count INTEGER NOT NULL,
    top_genre_slug TEXT,
    roster TEXT NOT NULL,
    hub_count INTEGER NOT NULL DEFAULT 0,
    hub_roster TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE browse_genre_city (
    genre_slug TEXT NOT NULL,
    city_slug TEXT NOT NULL,
    artist_count INTEGER NOT NULL,
    PRIMARY KEY (genre_slug, city_slug)
  );

  CREATE TABLE browse_related_genres (
    genre_slug TEXT NOT NULL,
    related_slug TEXT NOT NULL,
    shared_artists INTEGER NOT NULL,
    affinity REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (genre_slug, related_slug)
  );

  CREATE TABLE browse_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const bump = (map: Map<string, number>, key: string, by = 1) =>
  map.set(key, (map.get(key) ?? 0) + by);

export interface RosterEntry {
  urn: string;
  permalink: string | null;
  cityRaw: string | null;
  connections: number;
  followers: number;
  plays: number;
  likes: number;
  comments: number;
  trackCount: number | null;
  lastUploadAt: string | null;
  otherGenres: string[];
}

export function aggregate(
  db: Database,
  config: AggregateConfig = DEFAULT_AGGREGATE_CONFIG,
  now: () => string = () => new Date().toISOString(),
  canon: CityCanon = EMPTY_CITY_CANON,
  accountCanon: AccountCanon = EMPTY_ACCOUNT_CANON,
): AggregateReport {
  // Hub names never become genres: "Rinse FM" as a track's genre field is
  // a radio rip's provenance, not a sound.
  const hubFolds = new Set([
    ...[...accountCanon.hubPermalinks].map(foldTerm),
    ...accountCanon.hubTermFolds,
  ]);
  const terms = db.prepare(`SELECT artist_urn, term, kind, evidence FROM artist_terms`).all() as TermRow[];
  const artists = db
    .prepare(
      `SELECT urn, permalink, city_raw, country_code, last_upload_at, track_count,
              followers_count, plays_total, likes_total, comments_total, account_kind
       FROM artists`,
    )
    .all() as ArtistRow[];
  const artistByUrn = new Map(artists.map((a) => [a.urn, a]));

  // --- City discovery from self-declared locations (before genres: genre
  // terms colliding with city names get excluded). "Brooklyn, NY" folds on
  // its first comma segment so metro variants merge mechanically; the canon
  // adds the judgment folding can't: non-places ("Worldwide" declarers stay
  // in the graph, just unlocated) and alias merges ("NYC" → "New York"). ---
  const cityGroups = new Map<string, { spellings: Map<string, number>; urns: string[] }>();
  const canonicalNames = new Map<string, string>(); // group key -> canon-forced display name
  for (const artist of artists) {
    const raw = artist.city_raw?.trim();
    if (!raw) continue;
    const cityPart = raw.split(",")[0].trim();
    const foldKey = foldTerm(cityPart);
    if (!foldKey || canon.nonPlaces.has(foldKey)) continue;
    const canonical = canon.aliases.get(foldKey);
    const key = canonical ? foldTerm(canonical) : foldKey;
    if (canonical) canonicalNames.set(key, canonical);
    if (!cityGroups.has(key)) cityGroups.set(key, { spellings: new Map(), urns: [] });
    const group = cityGroups.get(key)!;
    bump(group.spellings, canonical ?? cityPart);
    group.urns.push(artist.urn);
  }

  // --- Genre discovery: fold variants, count genre-field declarations ---
  const genreDeclarers = new Map<string, Set<string>>(); // fold key -> artist urns (kind=genre)
  const spellingCounts = new Map<string, Map<string, number>>(); // fold key -> raw spelling counts
  for (const row of terms) {
    const key = foldTerm(row.term);
    if (!key) continue;
    if (row.kind === "genre") {
      if (!genreDeclarers.has(key)) genreDeclarers.set(key, new Set());
      genreDeclarers.get(key)!.add(row.artist_urn);
    }
    if (!spellingCounts.has(key)) spellingCounts.set(key, new Map());
    bump(spellingCounts.get(key)!, row.term, row.kind === "genre" ? 2 : 1);
  }

  // City names never become genres ("detroit" the tag vs Detroit the city),
  // and format terms (podcast/mix/live) are distribution noise, not genres.
  // The city reading must DOMINATE the genre reading to veto it — otherwise
  // two junk profiles declaring city "House" would nuke the House genre.
  const cityCounts = new Map(
    [...cityGroups.entries()]
      .filter(([, g]) => g.urns.length >= config.minCityArtists)
      .map(([key, g]) => [key, g.urns.length]),
  );
  const isCityDominated = (key: string) =>
    (cityCounts.get(key) ?? 0) >= (genreDeclarers.get(key)?.size ?? 0);
  const isExcludedGenreKey = (key: string) =>
    isFormatTerm(key) || hubFolds.has(key) || isCityDominated(key);

  const overThreshold = [...genreDeclarers.entries()].filter(
    ([, urns]) => urns.size >= config.minGenreArtists,
  );
  const excludedGenreTerms = overThreshold
    .filter(([key]) => isExcludedGenreKey(key))
    .map(([key, urns]) => ({
      term: mostFrequent(spellingCounts.get(key)!) ?? key,
      artists: urns.size,
      reason: isCityDominated(key) ? ("city" as const) : ("format" as const),
    }))
    .sort((a, b) => b.artists - a.artists);

  const qualifying = overThreshold
    .filter(([key]) => !isExcludedGenreKey(key))
    .map(([key, urns]) => {
      const name = titleCase(mostFrequent(spellingCounts.get(key)!) ?? key);
      return { key, name, slug: slugify(name), declarers: urns.size };
    })
    .sort((a, b) => b.declarers - a.declarers);
  const genreByKey = new Map(qualifying.map((g) => [g.key, g]));

  const belowThresholdGenreTerms = [...genreDeclarers.entries()]
    .filter(([key, urns]) => urns.size < config.minGenreArtists && !isExcludedGenreKey(key))
    .map(([key, urns]) => ({ term: mostFrequent(spellingCounts.get(key)!) ?? key, artists: urns.size }))
    .sort((a, b) => b.artists - a.artists)
    .slice(0, 20);

  // --- Genre membership: genre-field says so, or repeated tag evidence ---
  const memberships = new Map<string, Map<string, number>>(); // genre slug -> urn -> evidence
  for (const row of terms) {
    const genre = genreByKey.get(foldTerm(row.term));
    if (!genre) continue;
    const qualifies = row.kind === "genre" || row.evidence >= config.minTagEvidence;
    if (!qualifies) continue;
    if (!memberships.has(genre.slug)) memberships.set(genre.slug, new Map());
    bump(memberships.get(genre.slug)!, row.artist_urn, row.evidence);
  }

  const qualifyingCities = [...cityGroups.entries()]
    .filter(([, g]) => g.urns.length >= config.minCityArtists)
    .map(([key, g]) => {
      const name = canonicalNames.get(key) ?? mostFrequent(g.spellings) ?? key;
      const countries = new Map<string, number>();
      for (const urn of g.urns) {
        const cc = artistByUrn.get(urn)?.country_code;
        if (cc) bump(countries, cc);
      }
      // Country only when the vote is meaningful: most sightings carry no
      // country at all, and a lone stray vote must not label the city.
      // The API supplies full names ("United States"), not ISO codes.
      const totalVotes = [...countries.values()].reduce((sum, n) => sum + n, 0);
      const top = mostFrequent(countries);
      const topVotes = top ? (countries.get(top) ?? 0) : 0;
      const country = top && topVotes >= 3 && topVotes * 2 > totalVotes ? top : null;
      return { key, name, slug: slugify(name), urns: g.urns, country };
    })
    .sort((a, b) => b.urns.length - a.urns.length);

  const belowThresholdCities = [...cityGroups.entries()]
    .filter(([, g]) => g.urns.length < config.minCityArtists)
    .map(([, g]) => ({ city: mostFrequent(g.spellings) ?? "?", artists: g.urns.length }))
    .sort((a, b) => b.artists - a.artists)
    .slice(0, 20);

  const cityByUrn = new Map<string, string>();
  for (const city of qualifyingCities) {
    for (const urn of city.urns) cityByUrn.set(urn, city.slug);
  }

  // --- Scope-degree ranking (connections within a member set) ---
  // One adjacency pass over edges; per-scope degree is then O(members × avg degree)
  // instead of O(|edges|) per genre/city.
  const adjacency = new Map<string, { other: string; weight: number }[]>();
  const edgeRows = db
    .prepare(`SELECT src_urn, dst_urn, SUM(weight) AS weight FROM edges GROUP BY src_urn, dst_urn`)
    .all() as { src_urn: string; dst_urn: string; weight: number }[];
  for (const edge of edgeRows) {
    if (!adjacency.has(edge.src_urn)) adjacency.set(edge.src_urn, []);
    adjacency.get(edge.src_urn)!.push({ other: edge.dst_urn, weight: edge.weight });
    if (!adjacency.has(edge.dst_urn)) adjacency.set(edge.dst_urn, []);
    adjacency.get(edge.dst_urn)!.push({ other: edge.src_urn, weight: edge.weight });
  }

  /**
   * Roster ranking: reach first (followers), then impact (likes + comments,
   * then plays), then graph connections as the final signal. `candidates`
   * restricts who may appear (genre previews use primary-genre assignment)
   * while degree is still computed against the full member set.
   */
  const isHubUrn = (urn: string) => artistByUrn.get(urn)?.account_kind === "hub";

  function rankRoster(
    memberUrns: Set<string>,
    candidates?: Set<string>,
    kind: "artist" | "hub" = "artist",
  ): RosterEntry[] {
    const pool = candidates ?? memberUrns;
    // Artists and hubs (labels/radios/promo, classified by the scenes run)
    // rank in separate rosters; both count as members and carry edges.
    return [...pool]
      .filter((urn) => (kind === "hub") === isHubUrn(urn))
      .map((urn) => {
        const artist = artistByUrn.get(urn);
        const connections = (adjacency.get(urn) ?? []).reduce(
          (sum, { other, weight }) => (memberUrns.has(other) ? sum + weight : sum),
          0,
        );
        return {
          urn,
          permalink: artist?.permalink ?? null,
          cityRaw: artist?.city_raw ?? null,
          connections,
          followers: artist?.followers_count ?? 0,
          plays: artist?.plays_total ?? 0,
          likes: artist?.likes_total ?? 0,
          comments: artist?.comments_total ?? 0,
          trackCount: artist?.track_count ?? null,
          lastUploadAt: artist?.last_upload_at ?? null,
          otherGenres: [] as string[],
        };
      })
      .sort(
        (a, b) =>
          b.followers - a.followers ||
          b.likes + b.comments - (a.likes + a.comments) ||
          b.plays - a.plays ||
          b.connections - a.connections ||
          a.urn.localeCompare(b.urn),
      )
      .slice(0, config.rosterSize);
  }

  const genreMembers = new Map<string, Set<string>>(
    [...memberships.entries()].map(([slug, m]) => [slug, new Set(m.keys())]),
  );
  const genresOfArtist = new Map<string, string[]>();
  for (const [slug, members] of genreMembers) {
    for (const urn of members) {
      genresOfArtist.set(urn, [...(genresOfArtist.get(urn) ?? []), slug]);
    }
  }

  // Primary-genre assignment: an artist can BELONG to many genres, but is
  // PREVIEWED (roster/covers) only under the 1-2 where their own tracks
  // concentrate. Ties prefer the smaller genre — specificity beats "techno"
  // swallowing everyone — then alphabetical for determinism.
  const evidenceOf = (urn: string, slug: string) => memberships.get(slug)?.get(urn) ?? 0;
  const primaryMembers = new Map<string, Set<string>>();
  for (const [urn, slugs] of genresOfArtist) {
    const top = [...slugs]
      .sort(
        (a, b) =>
          evidenceOf(urn, b) - evidenceOf(urn, a) ||
          (genreMembers.get(a)?.size ?? 0) - (genreMembers.get(b)?.size ?? 0) ||
          a.localeCompare(b),
      )
      .slice(0, 2);
    for (const slug of top) {
      if (!primaryMembers.has(slug)) primaryMembers.set(slug, new Set());
      primaryMembers.get(slug)!.add(urn);
    }
  }

  /** Preview candidates for a genre; falls back to all members when primaries are too thin. */
  const previewPool = (slug: string, members: Set<string>): Set<string> => {
    const primaries = primaryMembers.get(slug);
    return primaries && primaries.size >= 3 ? primaries : members;
  };
  const withOtherGenres = (roster: RosterEntry[], scopeSlug?: string): RosterEntry[] =>
    roster.map((entry) => ({
      ...entry,
      otherGenres: (genresOfArtist.get(entry.urn) ?? []).filter((s) => s !== scopeSlug).slice(0, 3),
    }));

  // --- Write everything in one transaction ---
  const report = db.transaction((): AggregateReport => {
    db.exec(DERIVED_SCHEMA);

    const insertArtistGenre = db.prepare(
      `INSERT INTO artist_genres (artist_urn, genre_slug, evidence) VALUES (?, ?, ?)`,
    );
    const insertArtistCity = db.prepare(
      `INSERT INTO artist_cities (artist_urn, city_slug) VALUES (?, ?)`,
    );
    const insertGenre = db.prepare(
      `INSERT INTO browse_genres (slug, name, artist_count, top_city_slug, top_terms, roster,
                                  hub_count, hub_roster)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertCity = db.prepare(
      `INSERT INTO browse_cities (slug, name, country, artist_count, top_genre_slug, roster,
                                  hub_count, hub_roster)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertGenreCity = db.prepare(
      `INSERT INTO browse_genre_city (genre_slug, city_slug, artist_count) VALUES (?, ?, ?)`,
    );
    const insertRelated = db.prepare(
      `INSERT INTO browse_related_genres (genre_slug, related_slug, shared_artists, affinity)
       VALUES (?, ?, ?, ?)`,
    );

    let genreMemberships = 0;
    for (const [slug, members] of memberships) {
      for (const [urn, evidence] of members) {
        insertArtistGenre.run(urn, slug, evidence);
        genreMemberships += 1;
      }
    }
    for (const [urn, citySlug] of cityByUrn) {
      insertArtistCity.run(urn, citySlug);
    }

    // genre × city counts
    const pairCounts = new Map<string, number>();
    for (const [slug, members] of genreMembers) {
      for (const urn of members) {
        const citySlug = cityByUrn.get(urn);
        if (citySlug) bump(pairCounts, `${slug} ${citySlug}`);
      }
    }
    for (const [pair, count] of pairCounts) {
      const [genreSlug, citySlug] = pair.split(" ");
      insertGenreCity.run(genreSlug, citySlug, count);
    }

    for (const genre of qualifying) {
      const members = genreMembers.get(genre.slug) ?? new Set();
      const cityCounts = new Map<string, number>();
      for (const urn of members) {
        const citySlug = cityByUrn.get(urn);
        if (citySlug) bump(cityCounts, citySlug);
      }
      // Card subtitle: what else this genre's artists tag their music as.
      const coTerms = new Map<string, number>();
      for (const urn of members) {
        for (const other of genresOfArtist.get(urn) ?? []) {
          if (other !== genre.slug) bump(coTerms, other);
        }
      }
      const topTerms = [...coTerms.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([slug]) => slug);

      const hubMembers = [...members].filter(isHubUrn).length;
      insertGenre.run(
        genre.slug,
        genre.name,
        members.size - hubMembers,
        mostFrequent(cityCounts),
        JSON.stringify(topTerms),
        JSON.stringify(
          withOtherGenres(rankRoster(members, previewPool(genre.slug, members)), genre.slug),
        ),
        hubMembers,
        JSON.stringify(withOtherGenres(rankRoster(members, undefined, "hub"), genre.slug)),
      );
    }

    for (const city of qualifyingCities) {
      const members = new Set(city.urns);
      const genreCounts = new Map<string, number>();
      for (const urn of members) {
        for (const slug of genresOfArtist.get(urn) ?? []) bump(genreCounts, slug);
      }
      const hubMembers = [...members].filter(isHubUrn).length;
      insertCity.run(
        city.slug,
        city.name,
        city.country,
        members.size - hubMembers,
        mostFrequent(genreCounts),
        JSON.stringify(withOtherGenres(rankRoster(members))),
        hubMembers,
        JSON.stringify(withOtherGenres(rankRoster(members, undefined, "hub"))),
      );
    }

    // Related genres by Jaccard affinity: raw shared-counts just rank the
    // biggest genres everywhere; overlap relative to both sizes surfaces the
    // genuinely closest scenes (dub techno ↔ deep techno, not ↔ "electronic").
    const genreList = [...genreMembers.keys()];
    for (const a of genreList) {
      for (const b of genreList) {
        if (a >= b) continue;
        const membersA = genreMembers.get(a)!;
        const membersB = genreMembers.get(b)!;
        const shared = [...membersA].filter((urn) => membersB.has(urn)).length;
        if (shared > 0) {
          const affinity = shared / (membersA.size + membersB.size - shared);
          insertRelated.run(a, b, shared, affinity);
          insertRelated.run(b, a, shared, affinity);
        }
      }
    }

    const setMeta = db.prepare(`INSERT INTO browse_meta (key, value) VALUES (?, ?)`);
    setMeta.run("aggregated_at", now());
    setMeta.run("config", JSON.stringify(config));

    return {
      genres: qualifying.length,
      cities: qualifyingCities.length,
      genreMemberships,
      cityMemberships: cityByUrn.size,
      belowThresholdGenreTerms,
      belowThresholdCities,
      excludedGenreTerms,
    };
  })();

  return report;
}
