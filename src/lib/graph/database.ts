/**
 * Graph database connection — the persistent atlas store (ideas/0003).
 *
 * Deliberately separate from data/cache.db: the cache is a disposable TTL
 * key-value store, the graph is the product. Holds URNs, edges, and derived
 * observations only — never mirrored profile display data (ToS posture).
 */

import Database from "better-sqlite3";
import path from "path";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS artists (
    urn TEXT PRIMARY KEY,
    permalink TEXT,
    city_raw TEXT,
    country_code TEXT,
    last_upload_at TEXT,
    track_count INTEGER,
    followers_count INTEGER,
    depth INTEGER NOT NULL,
    discovered_via TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    last_crawled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS edges (
    src_urn TEXT NOT NULL,
    dst_urn TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('follow', 'repost')),
    weight REAL NOT NULL DEFAULT 1,
    source TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    PRIMARY KEY (src_urn, dst_urn, type)
  );
  CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges (dst_urn);

  CREATE TABLE IF NOT EXISTS artist_terms (
    artist_urn TEXT NOT NULL,
    term TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('genre', 'tag')),
    evidence INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL,
    PRIMARY KEY (artist_urn, term, kind)
  );

  CREATE TABLE IF NOT EXISTS purchase_links (
    artist_urn TEXT NOT NULL,
    url TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    PRIMARY KEY (artist_urn, url)
  );

  CREATE TABLE IF NOT EXISTS crawl_queue (
    urn TEXT PRIMARY KEY,
    depth INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    enqueued_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_queue_status ON crawl_queue (status, enqueued_at);

  -- Scene engine output (ideas/0004 A1). Persistent, replaced per run with
  -- IDs carried across runs via max-Jaccard matching — never re-numbered.
  CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE,
    name TEXT,                          -- NULL = unnamed, excluded from UI
    city_name TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    member_count INTEGER NOT NULL,      -- crawled artist members (honest display count)
    total_count INTEGER NOT NULL,       -- including the uncrawled frontier
    roster TEXT NOT NULL DEFAULT '[]',
    hubs TEXT NOT NULL DEFAULT '[]',    -- labels/radios/promo in the scene (B4)
    resolution REAL,
    computed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scene_members (
    scene_id INTEGER NOT NULL,
    artist_urn TEXT NOT NULL,
    in_scene_degree REAL NOT NULL,
    PRIMARY KEY (scene_id, artist_urn)
  );
  CREATE INDEX IF NOT EXISTS idx_scene_members_artist ON scene_members (artist_urn);

  CREATE TABLE IF NOT EXISTS crawl_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running'
      CHECK (status IN ('running', 'completed', 'interrupted', 'failed')),
    seed_set TEXT NOT NULL,
    stats_json TEXT,
    snapshot_path TEXT
  );
`;

export function defaultGraphDbPath(): string {
  return process.env.GRAPH_DB_PATH || path.join(process.cwd(), "data", "graph.db");
}

/** Open (and initialize) a graph database. Pass ":memory:" in tests. */
export function openGraphDatabase(dbPath: string = defaultGraphDbPath()): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Additive migrations for databases created by earlier schema versions. */
function migrate(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(artists)`).all() as { name: string }[];
  // Engagement totals summed over observed tracks (impact signal for ranking).
  for (const column of ["plays_total", "likes_total", "comments_total"]) {
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE artists ADD COLUMN ${column} INTEGER`);
    }
  }

  // Priority crawling (ideas/0004 C1): pending items with more inbound
  // edges are crawled first — scene-central unknowns over random frontier.
  const queueColumns = db.prepare(`PRAGMA table_info(crawl_queue)`).all() as { name: string }[];
  if (!queueColumns.some((c) => c.name === "priority")) {
    db.exec(`ALTER TABLE crawl_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`);
  }

  // Hub split (ideas/0004 B4): scenes created before the column existed.
  const sceneColumns = db.prepare(`PRAGMA table_info(scenes)`).all() as { name: string }[];
  if (!sceneColumns.some((c) => c.name === "hubs")) {
    db.exec(`ALTER TABLE scenes ADD COLUMN hubs TEXT NOT NULL DEFAULT '[]'`);
  }
}
