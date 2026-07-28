/**
 * Scene store (ideas/0004 A3): read-only queries over the `scenes` +
 * `scene_members` tables `npm run scenes` maintains in graph.db.
 * Server-only. Unnamed scenes never surface; a database without scene
 * tables degrades to empty results.
 */

import type Database from "better-sqlite3";
import {
  ACTIVITY_WINDOWS,
  activityLine,
  genreName,
  getDb,
  hasSceneTables,
  parseRoster,
  type ActivityCounts,
} from "./store";
import type { LinkedCount, SceneDetail, SceneHome, SceneSummary } from "./types";

// Geographic-character thresholds (ideas/0005). Tuned against the Jul 28
// circles-vs-places measurement: real place circles ran ≥33% top-city share,
// tinted 18–33%, placeless below. Coverage gates out sparse-geodata noise —
// only ~34% of artists declare a city, so a claim needs enough located members
// AND a floor share of the circle located at all.
const HOME_MIN_LOCATED = 5;
const HOME_MIN_COVERAGE = 0.12;
const HOME_PLACE_SHARE = 0.33;
const HOME_TINTED_SHARE = 0.18;

const PLACELESS: SceneHome = {
  label: "Global — no single home",
  city: null,
  share: null,
  kind: "global",
};

/**
 * Where a circle "lives", from its top city vs. all located members. Pure so
 * the three regimes are unit-testable without a database (ideas/0005).
 */
export function classifySceneHome(
  memberCount: number,
  located: number,
  topCity: string | null,
  topCount: number,
): SceneHome {
  if (
    !topCity ||
    memberCount <= 0 ||
    located < HOME_MIN_LOCATED ||
    located / memberCount < HOME_MIN_COVERAGE
  ) {
    return PLACELESS;
  }
  const share = topCount / located;
  if (share >= HOME_PLACE_SHARE) {
    return { label: `A ${topCity} scene`, city: topCity, share, kind: "place" };
  }
  if (share >= HOME_TINTED_SHARE) {
    return {
      label: `Centered on ${topCity} (${Math.round(share * 100)}% of located members)`,
      city: topCity,
      share,
      kind: "tinted",
    };
  }
  return PLACELESS;
}

function sceneHome(
  db: Database.Database,
  sceneId: number,
  memberCount: number,
  topCity: string | null,
  topCount: number,
): SceneHome {
  if (!topCity || memberCount <= 0) return PLACELESS;
  const { located } = db
    .prepare(
      `SELECT COUNT(*) AS located
       FROM scene_members sm JOIN artist_cities ac ON ac.artist_urn = sm.artist_urn
       WHERE sm.scene_id = ?`,
    )
    .get(sceneId) as { located: number };
  return classifySceneHome(memberCount, located, topCity, topCount);
}

interface SceneRow {
  id: number;
  slug: string;
  name: string;
  city_name: string | null;
  tags: string;
  member_count: number;
  hub_count: number;
  roster: string;
  hubs: string;
}

function sceneActivity(db: Database.Database, sceneId: number, now: number): ActivityCounts {
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.last_upload_at > ? THEN 1 ELSE 0 END) AS day,
         SUM(CASE WHEN a.last_upload_at > ? THEN 1 ELSE 0 END) AS week
       FROM scene_members m JOIN artists a ON a.urn = m.artist_urn
       WHERE m.scene_id = ?`,
    )
    .get(
      new Date(now - ACTIVITY_WINDOWS.dayMs).toISOString(),
      new Date(now - ACTIVITY_WINDOWS.weekMs).toISOString(),
      sceneId,
    ) as { day: number | null; week: number | null };
  return { activeNow: (row.day ?? 0) > 0, uploadsThisWeek: row.week ?? 0 };
}

/** Batched activity for the list render: one GROUP BY over all scenes. */
function sceneActivityMap(db: Database.Database, now: number): Map<number, ActivityCounts> {
  // Week-active artists first, then join memberships (see store.activityMap).
  const rows = db
    .prepare(
      `SELECT m.scene_id AS id,
         SUM(CASE WHEN a.last_upload_at > ? THEN 1 ELSE 0 END) AS day,
         COUNT(*) AS week
       FROM artists a JOIN scene_members m ON m.artist_urn = a.urn
       WHERE a.last_upload_at > ?
       GROUP BY m.scene_id`,
    )
    .all(
      new Date(now - ACTIVITY_WINDOWS.dayMs).toISOString(),
      new Date(now - ACTIVITY_WINDOWS.weekMs).toISOString(),
    ) as { id: number; day: number | null; week: number | null }[];
  return new Map(
    rows.map((row) => [
      row.id,
      { activeNow: (row.day ?? 0) > 0, uploadsThisWeek: row.week ?? 0 },
    ]),
  );
}

function sceneSummary(
  db: Database.Database,
  row: SceneRow,
  now: number,
  batchedCounts?: ActivityCounts,
): SceneSummary {
  const counts = batchedCounts ?? sceneActivity(db, row.id, now);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    cityName: row.city_name,
    tags: JSON.parse(row.tags) as string[],
    memberCount: row.member_count,
    hubCount: row.hub_count,
    activity: activityLine(counts),
    activeNow: counts.activeNow,
    coverUrns: parseRoster(row.roster)
      .slice(0, 20)
      .map((artist) => artist.urn),
  };
}

/** Named scenes only, largest crawled roster first. */
export function listScenes(now: number = Date.now()): SceneSummary[] {
  const db = getDb();
  if (!db || !hasSceneTables(db)) return [];
  const rows = db
    .prepare(
      `SELECT id, slug, name, city_name, tags, member_count, hub_count, roster, hubs
       FROM scenes WHERE name IS NOT NULL
       ORDER BY member_count DESC, id`,
    )
    .all() as SceneRow[];
  const counts = sceneActivityMap(db, now);
  return rows.map((row) =>
    sceneSummary(db, row, now, counts.get(row.id) ?? { activeNow: false, uploadsThisWeek: 0 }),
  );
}

export function getSceneDetail(slug: string, now: number = Date.now()): SceneDetail | null {
  const db = getDb();
  if (!db || !hasSceneTables(db)) return null;
  const row = db
    .prepare(
      `SELECT id, slug, name, city_name, tags, member_count, hub_count, roster, hubs
       FROM scenes WHERE slug = ? AND name IS NOT NULL`,
    )
    .get(slug) as SceneRow | undefined;
  if (!row) return null;

  const genres = db
    .prepare(
      `SELECT ag.genre_slug AS slug, g.name, COUNT(*) AS count
       FROM scene_members sm
       JOIN artist_genres ag ON ag.artist_urn = sm.artist_urn
       JOIN browse_genres g ON g.slug = ag.genre_slug
       WHERE sm.scene_id = ?
       GROUP BY ag.genre_slug ORDER BY count DESC, g.name LIMIT 6`,
    )
    .all(row.id) as LinkedCount[];

  const cities = db
    .prepare(
      `SELECT ac.city_slug AS slug, c.name, COUNT(*) AS count
       FROM scene_members sm
       JOIN artist_cities ac ON ac.artist_urn = sm.artist_urn
       JOIN browse_cities c ON c.slug = ac.city_slug
       WHERE sm.scene_id = ?
       GROUP BY ac.city_slug ORDER BY count DESC, c.name LIMIT 6`,
    )
    .all(row.id) as LinkedCount[];

  // cities is ordered by count DESC, so cities[0] is the top city.
  const home = sceneHome(db, row.id, row.member_count, cities[0]?.name ?? null, cities[0]?.count ?? 0);

  return {
    ...sceneSummary(db, row, now),
    roster: parseRoster(row.roster).map((artist) => ({
      ...artist,
      otherGenres: artist.otherGenres.map((s) => genreName(db, s)),
    })),
    hubs: parseRoster(row.hubs),
    genres,
    cities,
    home,
  };
}

/** Named scenes whose members overlap a genre — "scenes inside this genre". */
export function scenesForGenre(genreSlug: string, limit = 6): LinkedCount[] {
  const db = getDb();
  if (!db || !hasSceneTables(db)) return [];
  return db
    .prepare(
      `SELECT s.slug, s.name, COUNT(*) AS count
       FROM artist_genres ag
       JOIN scene_members sm ON sm.artist_urn = ag.artist_urn
       JOIN scenes s ON s.id = sm.scene_id
       WHERE ag.genre_slug = ? AND s.name IS NOT NULL
       GROUP BY s.id ORDER BY count DESC, s.name LIMIT ?`,
    )
    .all(genreSlug, limit) as LinkedCount[];
}
