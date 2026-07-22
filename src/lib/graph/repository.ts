/**
 * Typed operations over the graph database. All writes are idempotent
 * upserts so crawls can be killed and resumed at any point.
 */

import type { Database } from "better-sqlite3";

export interface ArtistUpsert {
  urn: string;
  permalink?: string;
  cityRaw?: string | null;
  countryCode?: string | null;
  lastUploadAt?: string | null;
  trackCount?: number | null;
  followersCount?: number | null;
  depth: number;
  discoveredVia?: string;
}

export interface EdgeRecord {
  srcUrn: string;
  dstUrn: string;
  type: "follow" | "repost";
  weight: number;
  source: string;
}

export interface TermRecord {
  artistUrn: string;
  term: string;
  kind: "genre" | "tag";
  evidence: number;
}

export interface QueueItem {
  urn: string;
  depth: number;
  attempts: number;
}

export interface RunStats {
  artistsVisited: number;
  edgesWritten: number;
  termsWritten: number;
  requestsMade: number;
  rateLimitHits: number;
  failures: number;
}

const MAX_ATTEMPTS = 3;

const SNAPSHOTTABLE_TABLES = new Set(["artists", "edges", "artist_terms", "purchase_links"]);

export class GraphRepository {
  constructor(
    private readonly db: Database,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  upsertArtist(artist: ArtistUpsert): void {
    // COALESCE(excluded.x, x): fresh non-null data wins, but a shallow sighting
    // (e.g. from a followings page) never blanks fields a full visit populated.
    this.db
      .prepare(
        `INSERT INTO artists (urn, permalink, city_raw, country_code, last_upload_at,
           track_count, followers_count, depth, discovered_via, first_seen, last_seen)
         VALUES (@urn, @permalink, @cityRaw, @countryCode, @lastUploadAt,
           @trackCount, @followersCount, @depth, @discoveredVia, @now, @now)
         ON CONFLICT(urn) DO UPDATE SET
           permalink = COALESCE(excluded.permalink, permalink),
           city_raw = COALESCE(excluded.city_raw, city_raw),
           country_code = COALESCE(excluded.country_code, country_code),
           last_upload_at = COALESCE(excluded.last_upload_at, last_upload_at),
           track_count = COALESCE(excluded.track_count, track_count),
           followers_count = COALESCE(excluded.followers_count, followers_count),
           depth = MIN(depth, excluded.depth),
           last_seen = excluded.last_seen`,
      )
      .run({
        urn: artist.urn,
        permalink: artist.permalink ?? null,
        cityRaw: artist.cityRaw ?? null,
        countryCode: artist.countryCode ?? null,
        lastUploadAt: artist.lastUploadAt ?? null,
        trackCount: artist.trackCount ?? null,
        followersCount: artist.followersCount ?? null,
        depth: artist.depth,
        discoveredVia: artist.discoveredVia ?? null,
        now: this.now(),
      });
  }

  recordEngagement(
    urn: string,
    totals: { plays: number; likes: number; comments: number },
  ): void {
    this.db
      .prepare(
        `UPDATE artists SET plays_total = ?, likes_total = ?, comments_total = ? WHERE urn = ?`,
      )
      .run(totals.plays, totals.likes, totals.comments, urn);
  }

  recordLastUpload(urn: string, lastUploadAt: string): void {
    this.db
      .prepare(
        `UPDATE artists SET last_upload_at = MAX(COALESCE(last_upload_at, ''), ?) WHERE urn = ?`,
      )
      .run(lastUploadAt, urn);
  }

  markCrawled(urn: string): void {
    this.db
      .prepare(`UPDATE artists SET last_crawled_at = ? WHERE urn = ?`)
      .run(this.now(), urn);
  }

  recordEdge(edge: EdgeRecord): void {
    this.db
      .prepare(
        `INSERT INTO edges (src_urn, dst_urn, type, weight, source, first_seen, last_seen)
         VALUES (@srcUrn, @dstUrn, @type, @weight, @source, @now, @now)
         ON CONFLICT(src_urn, dst_urn, type) DO UPDATE SET
           weight = MAX(weight, excluded.weight),
           last_seen = excluded.last_seen`,
      )
      .run({ ...edge, now: this.now() });
  }

  recordTerm(record: TermRecord): void {
    this.db
      .prepare(
        `INSERT INTO artist_terms (artist_urn, term, kind, evidence, last_seen)
         VALUES (@artistUrn, @term, @kind, @evidence, @now)
         ON CONFLICT(artist_urn, term, kind) DO UPDATE SET
           evidence = MAX(evidence, excluded.evidence),
           last_seen = excluded.last_seen`,
      )
      .run({ ...record, now: this.now() });
  }

  recordPurchaseLink(artistUrn: string, url: string): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO purchase_links (artist_urn, url, first_seen)
         VALUES (?, ?, ?)`,
      )
      .run(artistUrn, url, this.now());
  }

  /**
   * Enqueue for crawling. A re-sighting at a strictly shorter depth lowers
   * the stored depth and revives done/failed items: a node first reached at
   * max depth was never expanded, so a shorter path must re-visit it or the
   * BFS silently under-explores (visit order is nondeterministic).
   */
  enqueue(urn: string, depth: number): void {
    this.db
      .prepare(
        `INSERT INTO crawl_queue (urn, depth, status, attempts, enqueued_at)
         VALUES (?, ?, 'pending', 0, ?)
         ON CONFLICT(urn) DO UPDATE SET
           status = CASE
             WHEN excluded.depth < depth AND status IN ('done', 'failed') THEN 'pending'
             ELSE status
           END,
           depth = MIN(depth, excluded.depth)`,
      )
      .run(urn, depth, this.now());
  }

  /** Claim the oldest pending item, marking it in_progress. */
  claimNext(): QueueItem | null {
    const claim = this.db.transaction((): QueueItem | null => {
      const row = this.db
        .prepare(
          `SELECT urn, depth, attempts FROM crawl_queue
           WHERE status = 'pending' ORDER BY depth, enqueued_at LIMIT 1`,
        )
        .get() as QueueItem | undefined;
      if (!row) return null;
      this.db
        .prepare(`UPDATE crawl_queue SET status = 'in_progress' WHERE urn = ?`)
        .run(row.urn);
      return row;
    });
    return claim();
  }

  markDone(urn: string): void {
    this.db.prepare(`UPDATE crawl_queue SET status = 'done' WHERE urn = ?`).run(urn);
  }

  /** Failed visits retry up to MAX_ATTEMPTS, then park as failed. */
  markFailed(urn: string): void {
    this.db
      .prepare(
        `UPDATE crawl_queue SET
           attempts = attempts + 1,
           status = CASE WHEN attempts + 1 >= ${MAX_ATTEMPTS} THEN 'failed' ELSE 'pending' END
         WHERE urn = ?`,
      )
      .run(urn);
  }

  /** Startup recovery: anything left in_progress by a crash goes back to pending. */
  resetInProgress(): number {
    return this.db
      .prepare(`UPDATE crawl_queue SET status = 'pending' WHERE status = 'in_progress'`)
      .run().changes;
  }

  pendingCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'pending'`)
      .get() as { n: number };
    return row.n;
  }

  startRun(seedSet: readonly string[]): number {
    const result = this.db
      .prepare(`INSERT INTO crawl_runs (started_at, seed_set) VALUES (?, ?)`)
      .run(this.now(), JSON.stringify(seedSet));
    return Number(result.lastInsertRowid);
  }

  finishRun(
    runId: number,
    status: "completed" | "interrupted" | "failed",
    stats: RunStats,
    snapshotPath?: string,
  ): void {
    this.db
      .prepare(
        `UPDATE crawl_runs SET finished_at = ?, status = ?, stats_json = ?, snapshot_path = ?
         WHERE id = ?`,
      )
      .run(this.now(), status, JSON.stringify(stats), snapshotPath ?? null, runId);
  }

  counts(): { artists: number; edges: number; terms: number } {
    const one = (sql: string) => (this.db.prepare(sql).get() as { n: number }).n;
    return {
      artists: one(`SELECT COUNT(*) AS n FROM artists`),
      edges: one(`SELECT COUNT(*) AS n FROM edges`),
      terms: one(`SELECT COUNT(*) AS n FROM artist_terms`),
    };
  }

  /** Row iterators for snapshot export. */
  iterateTable(table: "artists" | "edges" | "artist_terms" | "purchase_links"): IterableIterator<unknown> {
    // Runtime allowlist backing the type union: the name is interpolated.
    if (!SNAPSHOTTABLE_TABLES.has(table)) {
      throw new Error(`Not a snapshottable table: ${table}`);
    }
    return this.db.prepare(`SELECT * FROM ${table}`).iterate();
  }
}
