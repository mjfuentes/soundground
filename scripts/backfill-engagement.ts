/**
 * One-off backfill: compute engagement totals (plays/likes/comments) for
 * already-crawled artists from the track collections the crawler wrote
 * through to cache.db. Zero API calls.
 *
 * Usage: node --env-file-if-exists=.env --import tsx scripts/backfill-engagement.ts
 */

import { getCacheService } from "@/lib/cache";
import { openGraphDatabase } from "@/lib/graph/database";
import { GraphRepository } from "@/lib/graph/repository";
import { observeTracks } from "@/lib/crawler/extract";
import { urnToId } from "@/lib/soundcloud/official-client";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

function log(message: string): void {
  process.stdout.write(`[backfill] ${message}\n`);
}

function main(): void {
  const db = openGraphDatabase();
  try {
    const repo = new GraphRepository(db);
    const cache = getCacheService();

    const crawled = db
      .prepare(
        `SELECT urn FROM artists WHERE last_crawled_at IS NOT NULL AND plays_total IS NULL`,
      )
      .all() as { urn: string }[];

    let updated = 0;
    let missing = 0;
    for (const { urn } of crawled) {
      // peekRetained: stale-but-retained entries are exactly what we want here.
      const cachedTracks = cache.peekRetained<{ collection: SoundCloudTrack[] }>(
        `official:tracks:${urnToId(urn)}:200`,
      );
      if (!cachedTracks?.collection) {
        missing += 1;
        continue;
      }
      const { engagement } = observeTracks(urn, cachedTracks.collection);
      repo.recordEngagement(urn, engagement);
      updated += 1;
    }

    log(
      `${crawled.length} crawled artists without engagement · ${updated} backfilled · ${missing} not in cache`,
    );
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`[backfill] fatal: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}
