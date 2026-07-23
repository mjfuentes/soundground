/**
 * Scene engine CLI (ideas/0004 Sprint 1): graph.db → named scenes.
 * Pure computation, zero API calls. Run after `npm run aggregate` so city
 * prefixes and genre links have data.
 *
 * Usage:
 *   npm run scenes
 *   npm run scenes -- --repost-hub-cap 40 --dust-threshold 20
 */

import { parseArgs } from "util";
import { loadAccountCanon } from "@/lib/browse/canon";
import { openGraphDatabase } from "@/lib/graph/database";
import { computeScenes, DEFAULT_SCENE_COMPUTE_CONFIG } from "@/lib/graph/scenes";
import { peekUser, peekTrackTitles } from "@/lib/soundcloud/official-cached-client";
import { urnToId } from "@/lib/soundcloud/official-client";

function log(message: string): void {
  process.stdout.write(`[scenes] ${message}\n`);
}

function main(): void {
  const { values } = parseArgs({
    options: {
      db: { type: "string" },
      "repost-hub-cap": { type: "string" },
      "dust-threshold": { type: "string" },
      "min-doc-frequency": { type: "string" },
    },
  });

  const config = {
    ...DEFAULT_SCENE_COMPUTE_CONFIG,
    edgeWeights: {
      ...DEFAULT_SCENE_COMPUTE_CONFIG.edgeWeights,
      ...(values["repost-hub-cap"]
        ? { repostHubCap: Number(values["repost-hub-cap"]) }
        : {}),
    },
    community: {
      ...DEFAULT_SCENE_COMPUTE_CONFIG.community,
      ...(values["dust-threshold"] ? { dustThreshold: Number(values["dust-threshold"]) } : {}),
    },
    naming: {
      ...DEFAULT_SCENE_COMPUTE_CONFIG.naming,
      ...(values["min-doc-frequency"]
        ? { minDocFrequency: Number(values["min-doc-frequency"]) }
        : {}),
    },
  };

  const accountCanon = loadAccountCanon();
  log(`canon: ${accountCanon.hubPermalinks.size} known hub accounts`);

  const db = openGraphDatabase(values.db);
  try {
    const started = Date.now();
    // Text classification reads cached profiles — disk only, zero API calls.
    const peekProfile = (urn: string) => {
      try {
        const id = urnToId(urn);
        const user = peekUser(id);
        if (!user) return null;
        return {
          username: user.username,
          description: user.description,
          trackTitles: peekTrackTitles(id) ?? undefined,
        };
      } catch {
        return null;
      }
    };
    const report = computeScenes(db, config, undefined, accountCanon, peekProfile);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    log(
      `${report.scenes} scenes (${report.named} named, ${report.unnamed} unnamed) · ` +
        `γ=${report.resolution} · ${report.unclusteredNodes} nodes unclustered · ` +
        `${report.subClustered} oversize communities split · ${seconds}s`,
    );
    for (const stats of report.sweep) {
      log(
        `  sweep γ=${stats.resolution}: ${stats.communityCount} communities, ` +
          `largest ${(stats.largestFraction * 100).toFixed(1)}%, ` +
          `median scene ${stats.medianSceneSize}`,
      );
    }
    log("largest named scenes (crawled members / total):");
    for (const scene of report.largest) {
      log(`  #${scene.id} ${scene.name} — ${scene.memberCount}/${scene.totalCount} [${scene.slug}]`);
    }
    if (report.unnamedScenes.length > 0) {
      log(
        `unnamed (no distinctive vocabulary, hidden from UI): ` +
          report.unnamedScenes
            .slice(0, 10)
            .map((scene) => `#${scene.id} (${scene.memberCount}/${scene.totalCount})`)
            .join(", "),
      );
    }
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`[scenes] fatal: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}
