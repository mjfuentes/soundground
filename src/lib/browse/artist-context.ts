/**
 * Artist page graph context: where an artist sits in the atlas ("appears
 * in" chips) and who they actually run with ("strongest connections").
 * Read-only over graph.db; missing tables degrade to empty results.
 */

import { getDb, hasSceneTables } from "./store";

export interface PresenceChip {
  kind: "circle" | "sound" | "place";
  slug: string;
  name: string;
}

/** Circles, top sounds, and places this artist belongs to, chip-ready. */
export function getArtistPresence(urn: string): PresenceChip[] {
  const db = getDb();
  if (!db) return [];

  const circles = hasSceneTables(db)
    ? (db
        .prepare(
          `SELECT s.slug, s.name FROM scene_members sm
           JOIN scenes s ON s.id = sm.scene_id
           WHERE sm.artist_urn = ? AND s.name IS NOT NULL`,
        )
        .all(urn) as { slug: string; name: string }[])
    : [];

  const sounds = db
    .prepare(
      `SELECT g.slug, g.name FROM artist_genres ag
       JOIN browse_genres g ON g.slug = ag.genre_slug
       WHERE ag.artist_urn = ? ORDER BY ag.evidence DESC LIMIT 4`,
    )
    .all(urn) as { slug: string; name: string }[];

  const places = db
    .prepare(
      `SELECT c.slug, c.name FROM artist_cities ac
       JOIN browse_cities c ON c.slug = ac.city_slug
       WHERE ac.artist_urn = ?`,
    )
    .all(urn) as { slug: string; name: string }[];

  return [
    ...circles.map((row) => ({ kind: "circle" as const, ...row })),
    ...sounds.map((row) => ({ kind: "sound" as const, ...row })),
    ...places.map((row) => ({ kind: "place" as const, ...row })),
  ];
}

export interface ArtistConnection {
  urn: string;
  permalink: string | null;
  /** e.g. "follows · reposts" — the real edge types behind the tie. */
  context: string;
  weight: number;
}

/**
 * The artist's strongest ties: both edge directions combined per
 * counterpart, ranked by total weight. The design's promise — "real
 * follows · reposts" — so the context lists the edge types that exist.
 */
export function getStrongestConnections(urn: string, limit = 5): ArtistConnection[] {
  const db = getDb();
  if (!db) return [];

  const rows = db
    .prepare(
      `SELECT
         CASE WHEN e.src_urn = @urn THEN e.dst_urn ELSE e.src_urn END AS other,
         SUM(e.weight) AS weight,
         GROUP_CONCAT(DISTINCT e.type) AS types
       FROM edges e
       WHERE e.src_urn = @urn OR e.dst_urn = @urn
       GROUP BY other
       ORDER BY weight DESC, other
       LIMIT @limit`,
    )
    .all({ urn, limit }) as { other: string; weight: number; types: string }[];
  if (rows.length === 0) return [];

  const permalinks = new Map(
    (
      db
        .prepare(
          `SELECT urn, permalink FROM artists
           WHERE urn IN (${rows.map(() => "?").join(",")})`,
        )
        .all(...rows.map((row) => row.other)) as { urn: string; permalink: string | null }[]
    ).map((row) => [row.urn, row.permalink]),
  );

  return rows.map((row) => ({
    urn: row.other,
    permalink: permalinks.get(row.other) ?? null,
    context: row.types
      .split(",")
      .sort()
      .map((type) => (type === "follow" ? "follows" : "reposts"))
      .join(" · "),
    weight: row.weight,
  }));
}
