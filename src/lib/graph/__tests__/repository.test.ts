import { openGraphDatabase } from "../database";
import { GraphRepository } from "../repository";
import type Database from "better-sqlite3";

describe("GraphRepository", () => {
  let db: Database.Database;
  let repo: GraphRepository;
  let tick: number;

  beforeEach(() => {
    db = openGraphDatabase(":memory:");
    tick = 0;
    repo = new GraphRepository(db, () => new Date(2026, 6, 21, 12, 0, tick++).toISOString());
  });

  afterEach(() => {
    db.close();
  });

  const getArtist = (urn: string) =>
    db.prepare(`SELECT * FROM artists WHERE urn = ?`).get(urn) as Record<string, unknown>;

  describe("upsertArtist", () => {
    it("inserts a new artist with first/last seen", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0, discoveredVia: "seed" });
      const row = getArtist("soundcloud:users:1");
      expect(row.depth).toBe(0);
      expect(row.first_seen).toBe(row.last_seen);
    });

    it("does not blank populated fields on shallow re-sighting", () => {
      repo.upsertArtist({
        urn: "soundcloud:users:1",
        depth: 1,
        cityRaw: "Buenos Aires",
        countryCode: "AR",
        trackCount: 12,
      });
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 2 });
      const row = getArtist("soundcloud:users:1");
      expect(row.city_raw).toBe("Buenos Aires");
      expect(row.track_count).toBe(12);
    });

    it("keeps the minimum depth across sightings", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 2 });
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 1 });
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 3 });
      expect(getArtist("soundcloud:users:1").depth).toBe(1);
    });

    it("updates fresh non-null data", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0 });
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0, trackCount: 5 });
      expect(getArtist("soundcloud:users:1").track_count).toBe(5);
    });
  });

  describe("recordEngagement", () => {
    it("stores engagement totals on the artist", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0 });
      repo.recordEngagement("soundcloud:users:1", { plays: 1500, likes: 75, comments: 5 });
      const row = getArtist("soundcloud:users:1");
      expect(row.plays_total).toBe(1500);
      expect(row.likes_total).toBe(75);
      expect(row.comments_total).toBe(5);
    });

    it("overwrites with the latest observation", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0 });
      repo.recordEngagement("soundcloud:users:1", { plays: 100, likes: 1, comments: 0 });
      repo.recordEngagement("soundcloud:users:1", { plays: 200, likes: 2, comments: 1 });
      expect(getArtist("soundcloud:users:1").plays_total).toBe(200);
    });
  });

  describe("recordLastUpload", () => {
    it("keeps the most recent upload time", () => {
      repo.upsertArtist({ urn: "soundcloud:users:1", depth: 0 });
      repo.recordLastUpload("soundcloud:users:1", "2026-07-01T00:00:00.000Z");
      repo.recordLastUpload("soundcloud:users:1", "2026-06-01T00:00:00.000Z");
      expect(getArtist("soundcloud:users:1").last_upload_at).toBe("2026-07-01T00:00:00.000Z");
    });
  });

  describe("recordEdge", () => {
    it("upserts keeping max weight", () => {
      const edge = {
        srcUrn: "soundcloud:users:1",
        dstUrn: "soundcloud:users:2",
        type: "repost" as const,
        source: "soundcloud:reposts",
      };
      repo.recordEdge({ ...edge, weight: 2 });
      repo.recordEdge({ ...edge, weight: 1 });
      const row = db.prepare(`SELECT * FROM edges`).get() as Record<string, unknown>;
      expect(row.weight).toBe(2);
      expect(db.prepare(`SELECT COUNT(*) AS n FROM edges`).get()).toEqual({ n: 1 });
    });

    it("stores follow and repost edges between the same pair separately", () => {
      const base = {
        srcUrn: "soundcloud:users:1",
        dstUrn: "soundcloud:users:2",
        weight: 1,
        source: "test",
      };
      repo.recordEdge({ ...base, type: "follow" });
      repo.recordEdge({ ...base, type: "repost" });
      expect(repo.counts().edges).toBe(2);
    });
  });

  describe("queue", () => {
    it("claims items in depth-then-FIFO order and marks them in progress", () => {
      repo.enqueue("soundcloud:users:2", 1);
      repo.enqueue("soundcloud:users:1", 0);
      expect(repo.claimNext()?.urn).toBe("soundcloud:users:1");
      expect(repo.claimNext()?.urn).toBe("soundcloud:users:2");
      expect(repo.claimNext()).toBeNull();
    });

    it("ignores re-enqueues at the same or deeper depth", () => {
      repo.enqueue("soundcloud:users:1", 1);
      repo.claimNext();
      repo.markDone("soundcloud:users:1");
      repo.enqueue("soundcloud:users:1", 1);
      repo.enqueue("soundcloud:users:1", 2);
      expect(repo.claimNext()).toBeNull();
    });

    it("revives a done item when rediscovered at a strictly shorter depth", () => {
      repo.enqueue("soundcloud:users:1", 2);
      repo.claimNext();
      repo.markDone("soundcloud:users:1");
      repo.enqueue("soundcloud:users:1", 1);
      const claimed = repo.claimNext();
      expect(claimed).toEqual(expect.objectContaining({ urn: "soundcloud:users:1", depth: 1 }));
    });

    it("lowers depth of a pending item without duplicating it", () => {
      repo.enqueue("soundcloud:users:1", 2);
      repo.enqueue("soundcloud:users:1", 0);
      expect(repo.claimNext()).toEqual(
        expect.objectContaining({ urn: "soundcloud:users:1", depth: 0 }),
      );
      expect(repo.claimNext()).toBeNull();
    });

    it("retries failed items up to 3 attempts then parks them", () => {
      repo.enqueue("soundcloud:users:1", 0);
      for (let i = 0; i < 2; i++) {
        expect(repo.claimNext()?.urn).toBe("soundcloud:users:1");
        repo.markFailed("soundcloud:users:1");
      }
      expect(repo.claimNext()?.urn).toBe("soundcloud:users:1");
      repo.markFailed("soundcloud:users:1");
      expect(repo.claimNext()).toBeNull();
      const row = db
        .prepare(`SELECT status, attempts FROM crawl_queue WHERE urn = ?`)
        .get("soundcloud:users:1");
      expect(row).toEqual({ status: "failed", attempts: 3 });
    });

    it("recovers in-progress items on resetInProgress", () => {
      repo.enqueue("soundcloud:users:1", 0);
      repo.claimNext();
      expect(repo.claimNext()).toBeNull();
      expect(repo.resetInProgress()).toBe(1);
      expect(repo.claimNext()?.urn).toBe("soundcloud:users:1");
    });
  });

  describe("runs", () => {
    it("records start and finish with stats", () => {
      const runId = repo.startRun(["soundcloud:users:1"]);
      repo.finishRun(
        runId,
        "completed",
        {
          artistsVisited: 3,
          edgesWritten: 10,
          termsWritten: 4,
          requestsMade: 20,
          rateLimitHits: 0,
          failures: 0,
        },
        "/tmp/snap",
      );
      const row = db.prepare(`SELECT * FROM crawl_runs WHERE id = ?`).get(runId) as Record<
        string,
        unknown
      >;
      expect(row.status).toBe("completed");
      expect(JSON.parse(row.stats_json as string).artistsVisited).toBe(3);
      expect(row.snapshot_path).toBe("/tmp/snap");
    });
  });
});
