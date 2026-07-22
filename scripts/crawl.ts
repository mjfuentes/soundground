/**
 * Crawler v0 CLI (ideas/0003 Phase 1).
 *
 * Usage:
 *   npm run crawl                      # data/seeds.json, depth 2
 *   npm run crawl -- --seeds my.json --max-depth 1 --db data/graph.db
 *
 * Requires SOUNDCLOUD_CLIENT_ID / SOUNDCLOUD_CLIENT_SECRET (loaded via
 * node --env-file=.env — see the npm script). Resumable: Ctrl-C stops after
 * the current visit; the next run continues the queue.
 */

import { readFile } from "fs/promises";
import path from "path";
import { parseArgs } from "util";
import { openGraphDatabase } from "@/lib/graph/database";
import { GraphRepository } from "@/lib/graph/repository";
import { Crawler, pacedCall } from "@/lib/crawler/crawler";
import { DEFAULT_CONFIG } from "@/lib/crawler/config";
import { RateLimiter } from "@/lib/crawler/rate-limiter";
import { writeSnapshot } from "@/lib/crawler/snapshot";
import {
  getFollowings,
  getReposts,
  getTracks,
  getUser,
  resolveProfile,
  userUrn,
} from "@/lib/soundcloud/official-client";
import {
  seedRepostsCache,
  seedTracksCache,
  seedUserCache,
} from "@/lib/soundcloud/official-cached-client";
import type { CrawlerApi } from "@/lib/crawler/crawler";

/**
 * Crawler API with write-through cache seeding: every profile/track fetch
 * the crawl makes also warms the app's profile-page caches.
 */
const crawlerApi: CrawlerApi = {
  getUser: async (userId) => {
    const user = await getUser(userId);
    seedUserCache(user);
    return user;
  },
  getTracks: async (userId, limit) => {
    const result = await getTracks(userId, limit);
    seedTracksCache(userId, result.collection);
    return result;
  },
  getReposts: async (userId, limit) => {
    const result = await getReposts(userId, limit);
    seedRepostsCache(userId, result.collection);
    return result;
  },
  getFollowings,
};

interface SeedFile {
  seeds: string[]; // URNs ("soundcloud:users:123") or permalinks/URLs
}

function log(message: string): void {
  process.stdout.write(`[crawl] ${new Date().toISOString()} ${message}\n`);
}

async function resolveSeeds(
  entries: readonly string[],
  limiter: RateLimiter,
): Promise<string[]> {
  const urns: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith("soundcloud:users:")) {
      urns.push(entry);
      continue;
    }
    const url = entry.startsWith("http") ? entry : `https://soundcloud.com/${entry}`;
    const profile = await pacedCall(limiter, () => resolveProfile(url), log);
    urns.push(userUrn(profile.id));
    log(`resolved seed ${entry} -> ${userUrn(profile.id)} (${profile.username})`);
  }
  return urns;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      seeds: { type: "string", default: path.join("data", "seeds.json") },
      "max-depth": { type: "string" },
      "max-minutes": { type: "string" },
      "interval-ms": { type: "string" },
      db: { type: "string" },
    },
  });

  if (!process.env.SOUNDCLOUD_CLIENT_ID || !process.env.SOUNDCLOUD_CLIENT_SECRET) {
    throw new Error(
      "SOUNDCLOUD_CLIENT_ID / SOUNDCLOUD_CLIENT_SECRET not set — run via `npm run crawl` (loads .env)",
    );
  }

  let seedFile: SeedFile;
  try {
    seedFile = JSON.parse(await readFile(values.seeds, "utf8")) as SeedFile;
  } catch (error) {
    throw new Error(
      `Could not read seeds file ${values.seeds}: ${error instanceof Error ? error.message : error}. ` +
        `Create it with {"seeds": ["<permalink-or-urn>", ...]} — see data/seeds.example.json`,
    );
  }
  if (!Array.isArray(seedFile.seeds) || seedFile.seeds.length === 0) {
    throw new Error(`${values.seeds} contains no seeds`);
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...(values["max-depth"] ? { maxDepth: Number(values["max-depth"]) } : {}),
    ...(values["max-minutes"]
      ? { maxRuntimeMs: Number(values["max-minutes"]) * 60_000 }
      : {}),
    // 429 backoff self-throttles if this proves too aggressive.
    ...(values["interval-ms"] ? { minRequestIntervalMs: Number(values["interval-ms"]) } : {}),
  };

  const db = openGraphDatabase(values.db);
  const repo = new GraphRepository(db);
  const limiter = new RateLimiter(config.minRequestIntervalMs);
  const crawler = new Crawler(repo, limiter, crawlerApi, config, log);

  process.once("SIGINT", () => {
    log("interrupt requested — finishing current visit, then stopping (Ctrl-C again to force)");
    crawler.requestInterrupt();
    process.once("SIGINT", () => process.exit(130));
  });

  const seedUrns = await resolveSeeds(seedFile.seeds, limiter);
  const runId = repo.startRun(seedUrns);
  log(`run ${runId} started · ${seedUrns.length} seeds · max depth ${config.maxDepth}`);

  try {
    const stats = await crawler.run(seedUrns);
    const snapshotDir = await writeSnapshot(repo, runId);
    const status = crawler.wasInterrupted ? "interrupted" : "completed";
    repo.finishRun(runId, status, stats, snapshotDir);
    const counts = repo.counts();
    log(
      `run ${runId} ${status} · visited ${stats.artistsVisited} · ` +
        `db now: ${counts.artists} artists, ${counts.edges} edges, ${counts.terms} terms · ` +
        `snapshot: ${snapshotDir}`,
    );
    if (crawler.wasInterrupted) {
      log(`queue has ${repo.pendingCount()} pending — rerun to continue`);
    }
  } catch (error) {
    repo.finishRun(runId, "failed", crawler.stats());
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`[crawl] fatal: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
