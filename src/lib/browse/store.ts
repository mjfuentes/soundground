/**
 * Browse store: read-only queries over the aggregated graph (browse_* tables
 * in data/graph.db). Server-only. Missing database or tables degrade to
 * empty results so the UI can render an honest "still crawling" state.
 */

import fs from "fs";
import Database from "better-sqlite3";
import { defaultGraphDbPath } from "@/lib/graph/database";
import type { RosterEntry } from "./aggregate";
import type {
  BrowseStatus,
  CityDetail,
  CitySummary,
  GenreDetail,
  GenreSummary,
  LinkedCount,
  RosterArtist,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// A missing/empty database is re-probed after a TTL so a server started
// before the first crawl+aggregate picks the data up without a restart.
const NULL_RECHECK_MS = 30_000;

let cachedDb: Database.Database | null | undefined;
let lastNullProbeAt = 0;

/** Shared read-only connection; also used by scene-store. Not for pages. */
export function getDb(now: number = Date.now()): Database.Database | null {
  if (cachedDb) return cachedDb;
  if (cachedDb === null && now - lastNullProbeAt < NULL_RECHECK_MS) return null;

  lastNullProbeAt = now;
  const dbPath = defaultGraphDbPath();
  if (!fs.existsSync(dbPath)) {
    cachedDb = null;
    return cachedDb;
  }
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const hasTables = db
      .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'browse_genres'`)
      .get() as { n: number };
    cachedDb = hasTables.n > 0 ? db : null;
    if (!cachedDb) db.close();
  } catch {
    cachedDb = null;
  }
  return cachedDb;
}

/** Test hook: reset the cached connection (e.g. after pointing GRAPH_DB_PATH elsewhere). */
export function __resetStoreForTests(): void {
  if (cachedDb) cachedDb.close();
  cachedDb = undefined;
  lastNullProbeAt = 0;
}

export interface ActivityCounts {
  activeNow: boolean;
  uploadsThisWeek: number;
}

export const ACTIVITY_WINDOWS = { dayMs: DAY_MS, weekMs: WEEK_MS };

function activityFor(
  db: Database.Database,
  memberTable: "artist_genres" | "artist_cities",
  memberColumn: "genre_slug" | "city_slug",
  slug: string,
  now: number,
): ActivityCounts {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.last_upload_at > ? THEN 1 ELSE 0 END) AS day,
         SUM(CASE WHEN a.last_upload_at > ? THEN 1 ELSE 0 END) AS week
       FROM ${memberTable} m JOIN artists a ON a.urn = m.artist_urn
       WHERE m.${memberColumn} = ?`,
    )
    .get(new Date(now - DAY_MS).toISOString(), new Date(now - WEEK_MS).toISOString(), slug) as {
    day: number | null;
    week: number | null;
  };
  return { activeNow: (row.day ?? 0) > 0, uploadsThisWeek: row.week ?? 0 };
}

export function activityLine(counts: ActivityCounts): string | null {
  if (counts.activeNow) return "active now";
  if (counts.uploadsThisWeek > 0) return `${counts.uploadsThisWeek} this week`;
  return null;
}

export function parseRoster(rosterJson: string): RosterArtist[] {
  const entries = JSON.parse(rosterJson) as RosterEntry[];
  return entries.map((entry) => ({
    urn: entry.urn,
    permalink: entry.permalink,
    cityRaw: entry.cityRaw,
    connections: entry.connections,
    followers: entry.followers ?? 0,
    plays: entry.plays ?? 0,
    likes: entry.likes ?? 0,
    comments: entry.comments ?? 0,
    trackCount: entry.trackCount,
    otherGenres: entry.otherGenres,
  }));
}

export const genreName = (db: Database.Database, slug: string): string =>
  ((db.prepare(`SELECT name FROM browse_genres WHERE slug = ?`).get(slug) as { name: string } | undefined)
    ?.name ?? slug);

interface GenreRow {
  slug: string;
  name: string;
  artist_count: number;
  top_city_slug: string | null;
  top_terms: string;
  roster: string;
}

interface CityRow {
  slug: string;
  name: string;
  country: string | null;
  artist_count: number;
  top_genre_slug: string | null;
  roster: string;
}

function genreSummary(db: Database.Database, row: GenreRow, now: number): GenreSummary {
  const counts = activityFor(db, "artist_genres", "genre_slug", row.slug, now);
  const cityName = row.top_city_slug
    ? ((db.prepare(`SELECT name FROM browse_cities WHERE slug = ?`).get(row.top_city_slug) as
        | { name: string }
        | undefined)?.name ?? null)
    : null;
  return {
    slug: row.slug,
    name: row.name,
    artistCount: row.artist_count,
    relatedNames: (JSON.parse(row.top_terms) as string[]).map((slug) => genreName(db, slug)),
    topCity: cityName,
    activity: activityLine(counts),
    activeNow: counts.activeNow,
    coverUrns: parseRoster(row.roster)
      .slice(0, 3)
      .map((artist) => artist.urn),
  };
}

function citySummary(db: Database.Database, row: CityRow, now: number): CitySummary {
  const counts = activityFor(db, "artist_cities", "city_slug", row.slug, now);
  return {
    slug: row.slug,
    name: row.name,
    country: row.country,
    artistCount: row.artist_count,
    topGenre: row.top_genre_slug ? genreName(db, row.top_genre_slug) : null,
    activity: activityLine(counts),
    activeNow: counts.activeNow,
    coverUrns: parseRoster(row.roster)
      .slice(0, 4)
      .map((artist) => artist.urn),
  };
}

export interface BrowseIndexEntry {
  kind: "genre" | "city" | "scene";
  slug: string;
  name: string;
}

/** Scene tables ship after browse tables; older databases may lack them. */
export function hasSceneTables(db: Database.Database): boolean {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'scenes'`)
    .get() as { n: number };
  return row.n > 0;
}

/** Lightweight name index for search quick-jumps (no activity computation). */
export function listBrowseIndex(): BrowseIndexEntry[] {
  const db = getDb();
  if (!db) return [];
  const genres = db
    .prepare(`SELECT slug, name FROM browse_genres ORDER BY artist_count DESC`)
    .all() as { slug: string; name: string }[];
  const cities = db
    .prepare(`SELECT slug, name FROM browse_cities ORDER BY artist_count DESC`)
    .all() as { slug: string; name: string }[];
  const scenes = hasSceneTables(db)
    ? (db
        .prepare(
          `SELECT slug, name FROM scenes WHERE name IS NOT NULL ORDER BY member_count DESC`,
        )
        .all() as { slug: string; name: string }[])
    : [];
  return [
    ...scenes.map((s) => ({ kind: "scene" as const, ...s })),
    ...genres.map((g) => ({ kind: "genre" as const, ...g })),
    ...cities.map((c) => ({ kind: "city" as const, ...c })),
  ];
}

export function getBrowseStatus(): BrowseStatus {
  const db = getDb();
  if (!db) {
    return { hasData: false, aggregatedAt: null, genreCount: 0, cityCount: 0, sceneCount: 0 };
  }
  const meta = db.prepare(`SELECT value FROM browse_meta WHERE key = 'aggregated_at'`).get() as
    | { value: string }
    | undefined;
  const genres = db.prepare(`SELECT COUNT(*) AS n FROM browse_genres`).get() as { n: number };
  const cities = db.prepare(`SELECT COUNT(*) AS n FROM browse_cities`).get() as { n: number };
  const scenes = hasSceneTables(db)
    ? (db.prepare(`SELECT COUNT(*) AS n FROM scenes WHERE name IS NOT NULL`).get() as { n: number })
    : { n: 0 };
  return {
    hasData: genres.n > 0 || cities.n > 0,
    aggregatedAt: meta?.value ?? null,
    genreCount: genres.n,
    cityCount: cities.n,
    sceneCount: scenes.n,
  };
}

export function listGenres(now: number = Date.now()): GenreSummary[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT * FROM browse_genres ORDER BY artist_count DESC, slug`)
    .all() as GenreRow[];
  return rows.map((row) => genreSummary(db, row, now));
}

export function listCities(now: number = Date.now()): CitySummary[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(`SELECT * FROM browse_cities ORDER BY artist_count DESC, slug`)
    .all() as CityRow[];
  return rows.map((row) => citySummary(db, row, now));
}

export function getGenreDetail(slug: string, now: number = Date.now()): GenreDetail | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`SELECT * FROM browse_genres WHERE slug = ?`).get(slug) as
    | GenreRow
    | undefined;
  if (!row) return null;

  const cities = db
    .prepare(
      `SELECT gc.city_slug AS slug, c.name, gc.artist_count AS count
       FROM browse_genre_city gc JOIN browse_cities c ON c.slug = gc.city_slug
       WHERE gc.genre_slug = ? ORDER BY gc.artist_count DESC, c.name LIMIT 6`,
    )
    .all(slug) as LinkedCount[];

  const related = db
    .prepare(
      `SELECT r.related_slug AS slug, g.name, r.shared_artists AS count
       FROM browse_related_genres r JOIN browse_genres g ON g.slug = r.related_slug
       WHERE r.genre_slug = ? ORDER BY r.affinity DESC, g.name LIMIT 6`,
    )
    .all(slug) as LinkedCount[];

  return {
    ...genreSummary(db, row, now),
    roster: parseRoster(row.roster).map((artist) => ({
      ...artist,
      otherGenres: artist.otherGenres.map((s) => genreName(db, s)),
    })),
    cities,
    related,
  };
}

export function getCityDetail(slug: string, now: number = Date.now()): CityDetail | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`SELECT * FROM browse_cities WHERE slug = ?`).get(slug) as
    | CityRow
    | undefined;
  if (!row) return null;

  const genres = db
    .prepare(
      `SELECT gc.genre_slug AS slug, g.name, gc.artist_count AS count
       FROM browse_genre_city gc JOIN browse_genres g ON g.slug = gc.genre_slug
       WHERE gc.city_slug = ? ORDER BY gc.artist_count DESC, g.name LIMIT 6`,
    )
    .all(slug) as LinkedCount[];

  const otherCities = db
    .prepare(
      `SELECT slug, name, artist_count AS count FROM browse_cities
       WHERE slug != ? ORDER BY artist_count DESC, name LIMIT 4`,
    )
    .all(slug) as LinkedCount[];

  return {
    ...citySummary(db, row, now),
    roster: parseRoster(row.roster).map((artist) => ({
      ...artist,
      otherGenres: artist.otherGenres.map((s) => genreName(db, s)),
    })),
    genres,
    otherCities,
  };
}
