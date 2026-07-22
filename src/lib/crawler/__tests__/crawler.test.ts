import type Database from "better-sqlite3";
import { openGraphDatabase } from "@/lib/graph/database";
import { GraphRepository } from "@/lib/graph/repository";
import type { SoundCloudFollower, SoundCloudTrack, SoundCloudUser } from "@/lib/soundcloud/client";
import { Crawler, type CrawlerApi } from "../crawler";
import { RateLimiter } from "../rate-limiter";

/**
 * Fake network: 1 follows 2 and 3; 2 follows 3; 1 reposts a track by 3.
 * Artist 4 is a listener account (0 tracks) followed by 3.
 */
const user = (id: number, overrides: Partial<SoundCloudUser> = {}): SoundCloudUser =>
  ({
    id,
    permalink: `artist-${id}`,
    username: `Artist ${id}`,
    permalink_url: `https://soundcloud.com/artist-${id}`,
    followers_count: 100,
    followings_count: 10,
    track_count: 5,
    playlist_count: 0,
    verified: false,
    city: id === 1 ? "Buenos Aires" : undefined,
    country_code: id === 1 ? "AR" : undefined,
    ...overrides,
  }) as SoundCloudUser;

const followerOf = (id: number, trackCount = 5): SoundCloudFollower => ({
  id,
  permalink: `artist-${id}`,
  username: `Artist ${id}`,
  followers_count: 100,
  track_count: trackCount,
});

const trackBy = (ownerId: number, overrides: Partial<SoundCloudTrack> = {}): SoundCloudTrack =>
  ({
    id: ownerId * 100,
    title: "t",
    permalink_url: "",
    duration: 60,
    genre: "dub techno",
    created_at: "2026/07/01 12:00:00 +0000",
    user: { id: ownerId, username: `Artist ${ownerId}`, permalink_url: "" },
    ...overrides,
  }) as SoundCloudTrack;

const NETWORK: Record<number, { followings: number[]; reposts: SoundCloudTrack[] }> = {
  1: { followings: [2, 3], reposts: [trackBy(3)] },
  2: { followings: [3], reposts: [] },
  3: { followings: [4], reposts: [] },
  4: { followings: [], reposts: [] },
};

function buildApi(overrides: Partial<CrawlerApi> = {}): CrawlerApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getUser: async (id) => {
      calls.push(`user:${id}`);
      return user(id, id === 4 ? { track_count: 0, followings_count: 5000 } : {});
    },
    getTracks: async (id) => {
      calls.push(`tracks:${id}`);
      return { collection: id === 4 ? [] : [trackBy(id)] };
    },
    getReposts: async (id) => {
      calls.push(`reposts:${id}`);
      return { collection: NETWORK[id]?.reposts ?? [] };
    },
    getFollowings: async (id) => {
      calls.push(`followings:${id}`);
      // Followings pages advertise track_count 5 for everyone (including the
      // listener account 4) so the full-visit guard is what rejects 4.
      return {
        collection: (NETWORK[id]?.followings ?? []).map((fid) => followerOf(fid)),
      };
    },
    ...overrides,
  };
}

const instantLimiter = () =>
  new RateLimiter(0, () => 0, async () => undefined);

describe("Crawler", () => {
  let db: Database.Database;
  let repo: GraphRepository;

  beforeEach(() => {
    db = openGraphDatabase(":memory:");
    repo = new GraphRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  function crawl(api: CrawlerApi, configOverrides = {}) {
    const crawler = new Crawler(repo, instantLimiter(), api, {
      maxDepth: 2,
      minRequestIntervalMs: 0,
      maxFollowingPages: 3,
      pageLimit: 200,
      maxConsecutiveFailures: 3,
      ...configOverrides,
    });
    return crawler;
  }

  it("BFS-crawls the network from the seed, recording edges and terms", async () => {
    const api = buildApi();
    const stats = await crawl(api).run(["soundcloud:users:1"]);

    // 1 (seed), 2, 3 visited fully; 4 visited but rejected by guard (0 tracks)
    expect(stats.artistsVisited).toBe(4);

    const edges = db.prepare(`SELECT src_urn, dst_urn, type, weight FROM edges ORDER BY src_urn, dst_urn`).all();
    expect(edges).toContainEqual({
      src_urn: "soundcloud:users:1",
      dst_urn: "soundcloud:users:2",
      type: "follow",
      weight: 1,
    });
    expect(edges).toContainEqual({
      src_urn: "soundcloud:users:1",
      dst_urn: "soundcloud:users:3",
      type: "repost",
      weight: 1,
    });

    const terms = db.prepare(`SELECT DISTINCT term FROM artist_terms`).all() as { term: string }[];
    expect(terms.map((t) => t.term)).toContain("dub techno");

    const seed = db.prepare(`SELECT * FROM artists WHERE urn = ?`).get("soundcloud:users:1") as Record<string, unknown>;
    expect(seed.city_raw).toBe("Buenos Aires");
    expect(seed.last_upload_at).toBe("2026-07-01T12:00:00.000Z");
    expect(seed.last_crawled_at).not.toBeNull();
  });

  it("does not fetch tracks/followings for guard-rejected accounts", async () => {
    const api = buildApi();
    await crawl(api).run(["soundcloud:users:1"]);
    expect(api.calls).toContain("user:4");
    expect(api.calls).not.toContain("tracks:4");
    expect(api.calls).not.toContain("followings:4");
  });

  it("skips enqueueing accounts with no tracks on followings pages", async () => {
    const api = buildApi({
      getFollowings: async (id) => ({
        collection: id === 1 ? [followerOf(5, 0)] : [],
      }),
    });
    await crawl(api).run(["soundcloud:users:1"]);
    expect(api.calls.filter((c) => c.startsWith("user:"))).not.toContain("user:5");
  });

  it("does not expand followings beyond max depth", async () => {
    const api = buildApi();
    await crawl(api, { maxDepth: 1 }).run(["soundcloud:users:1"]);
    // depth-1 artists (2, 3) get visited but not expanded
    expect(api.calls).toContain("tracks:2");
    expect(api.calls).not.toContain("followings:2");
    expect(api.calls).not.toContain("followings:3");
  });

  it("stops after the current visit when interrupted and resumes on next run", async () => {
    const api = buildApi();
    const crawler = crawl(api);
    const originalGetUser = api.getUser;
    api.getUser = async (id) => {
      if (id === 1) crawler.requestInterrupt();
      return originalGetUser(id);
    };

    const stats = await crawler.run(["soundcloud:users:1"]);
    expect(stats.artistsVisited).toBe(1);
    expect(crawler.wasInterrupted).toBe(true);
    expect(repo.pendingCount()).toBeGreaterThan(0);

    const resumed = await crawl(buildApi()).run(["soundcloud:users:1"]);
    expect(resumed.artistsVisited).toBe(3);
    expect(repo.pendingCount()).toBe(0);
  });

  it("retries on 429 with backoff and succeeds", async () => {
    let failures = 0;
    const api = buildApi({
      getUser: async (id) => {
        if (id === 1 && failures < 2) {
          failures += 1;
          const error = new Error("rate limited") as Error & { response: unknown };
          error.response = { statusCode: 429, headers: { "retry-after": "1" } };
          throw error;
        }
        return user(id);
      },
    });
    const stats = await crawl(api).run(["soundcloud:users:1"]);
    expect(stats.artistsVisited).toBe(4);
    expect(stats.rateLimitHits).toBe(2);
    expect(stats.failures).toBe(0);
  });

  it("marks a persistently failing visit as failed and continues", async () => {
    const api = buildApi({
      getUser: async (id) => {
        if (id === 2) throw new Error("boom");
        return user(id);
      },
    });
    const stats = await crawl(api, { maxConsecutiveFailures: 10 }).run(["soundcloud:users:1"]);
    expect(stats.failures).toBe(3); // 3 attempts on artist 2
    expect(stats.artistsVisited).toBe(3); // 1, 3, 4
    const row = db
      .prepare(`SELECT status FROM crawl_queue WHERE urn = ?`)
      .get("soundcloud:users:2");
    expect(row).toEqual({ status: "failed" });
  });

  it("aborts the run after too many consecutive failures", async () => {
    const api = buildApi({
      getUser: async () => {
        throw new Error("auth broken");
      },
    });
    await expect(
      crawl(api, { maxConsecutiveFailures: 3 }).run(["soundcloud:users:1"]),
    ).rejects.toThrow(/consecutive visit failures/);
  });

  it("stops gracefully when the time budget is exceeded", async () => {
    const api = buildApi({
      getUser: async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return user(id);
      },
    });
    const crawler = crawl(api, { maxRuntimeMs: 1 });
    const stats = await crawler.run(["soundcloud:users:1"]);
    expect(crawler.wasInterrupted).toBe(true);
    expect(stats.artistsVisited).toBe(1); // finished the in-flight visit, then stopped
    expect(repo.pendingCount()).toBeGreaterThan(0);
  });

  it("paginates followings up to the page cap", async () => {
    let pages = 0;
    const api = buildApi({
      getFollowings: async () => {
        pages += 1;
        return {
          collection: [followerOf(100 + pages)],
          next_href: "https://api.soundcloud.com/next",
        };
      },
    });
    await crawl(api, { maxDepth: 1, maxFollowingPages: 3 }).run(["soundcloud:users:1"]);
    expect(pages).toBe(3);
  });
});
