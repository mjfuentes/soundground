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
import type { LinkedCount, SceneDetail, SceneSummary } from "./types";

interface SceneRow {
  id: number;
  slug: string;
  name: string;
  city_name: string | null;
  tags: string;
  member_count: number;
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

function sceneSummary(db: Database.Database, row: SceneRow, now: number): SceneSummary {
  const counts = sceneActivity(db, row.id, now);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    cityName: row.city_name,
    tags: JSON.parse(row.tags) as string[],
    memberCount: row.member_count,
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
      `SELECT id, slug, name, city_name, tags, member_count, roster, hubs
       FROM scenes WHERE name IS NOT NULL
       ORDER BY member_count DESC, id`,
    )
    .all() as SceneRow[];
  return rows.map((row) => sceneSummary(db, row, now));
}

export function getSceneDetail(slug: string, now: number = Date.now()): SceneDetail | null {
  const db = getDb();
  if (!db || !hasSceneTables(db)) return null;
  const row = db
    .prepare(
      `SELECT id, slug, name, city_name, tags, member_count, roster, hubs
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

  return {
    ...sceneSummary(db, row, now),
    roster: parseRoster(row.roster).map((artist) => ({
      ...artist,
      otherGenres: artist.otherGenres.map((s) => genreName(db, s)),
    })),
    hubs: parseRoster(row.hubs),
    genres,
    cities,
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
