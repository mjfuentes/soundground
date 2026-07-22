/**
 * Shared test fixture: an in-memory graph.db holding two communities — a
 * Berlin dub techno circle (1–5, crawled, plus frontier artist 21 and
 * zero-track account 22) and a London jungle circle (11–15, crawled) —
 * joined by a single weak bridge follow. Used by the scene engine tests
 * and the browse scene-store tests.
 */

import type Database from "better-sqlite3";
import { aggregate } from "@/lib/browse/aggregate";
import { openGraphDatabase } from "../database";
import { GraphRepository } from "../repository";
import {
  computeScenes,
  DEFAULT_SCENE_COMPUTE_CONFIG,
  type SceneComputeConfig,
} from "../scenes";

export const urn = (id: number) => `soundcloud:users:${id}`;

export const TEST_SCENE_CONFIG: SceneComputeConfig = {
  ...DEFAULT_SCENE_COMPUTE_CONFIG,
  community: {
    ...DEFAULT_SCENE_COMPUTE_CONFIG.community,
    resolutions: [1],
    dustThreshold: 3,
  },
  naming: {
    ...DEFAULT_SCENE_COMPUTE_CONFIG.naming,
    minDocFrequency: 1,
    maxDocFraction: 1,
    minLocatedMembers: 2,
  },
  rosterSize: 10,
};

export function buildTwoSceneGraph(db: Database.Database): void {
  const repo = new GraphRepository(db, () => "2026-07-22T00:00:00.000Z");

  const put = (id: number, city: string | null, tracks: number | null, followers: number) =>
    repo.upsertArtist({
      urn: urn(id),
      permalink: `artist-${id}`,
      cityRaw: city,
      countryCode: city === "Berlin" ? "DE" : city ? "GB" : null,
      trackCount: tracks,
      followersCount: followers,
      depth: 0,
    });

  for (const id of [1, 2, 3, 4, 5]) put(id, "Berlin", 10, id === 1 ? 90000 : 100);
  for (const id of [11, 12, 13, 14, 15]) put(id, "London", 10, 100);
  put(21, null, null, 50); // frontier: never crawled, unknown tracks
  put(22, null, 0, 10); // zero-track account: member but never rostered

  for (const id of [1, 2, 3, 4, 5, 11, 12, 13, 14, 15]) {
    repo.markCrawled(urn(id));
    repo.recordTerm({
      artistUrn: urn(id),
      term: id < 10 ? "dub techno" : "jungle",
      kind: "genre",
      evidence: 3,
    });
  }
  repo.recordLastUpload(urn(2), "2026-07-21T18:00:00.000Z");

  const follow = (src: number, dst: number) =>
    repo.recordEdge({ srcUrn: urn(src), dstUrn: urn(dst), type: "follow", weight: 1, source: "t" });

  const cliques = [
    [1, 2, 3, 4, 5],
    [11, 12, 13, 14, 15],
  ];
  for (const clique of cliques) {
    for (const src of clique) {
      for (const dst of clique) {
        if (src !== dst) follow(src, dst);
      }
    }
  }
  // Reposts into 2 make it the scene's most-endorsed artist.
  for (const src of [1, 3, 4]) {
    repo.recordEdge({ srcUrn: urn(src), dstUrn: urn(2), type: "repost", weight: 3, source: "t" });
  }
  // Frontier + zero-track members hang off the dub techno circle.
  for (const src of [1, 2, 3]) follow(src, 21);
  for (const src of [1, 2]) follow(src, 22);
  // Weak bridge between the two scenes.
  follow(1, 11);
}

export function buildAggregatedTwoSceneDb(): Database.Database {
  const db = openGraphDatabase(":memory:");
  buildTwoSceneGraph(db);
  aggregate(
    db,
    { minGenreArtists: 2, minCityArtists: 2, minTagEvidence: 2, rosterSize: 12 },
    () => "2026-07-22T00:00:00.000Z",
  );
  return db;
}

/** Fixture with scenes computed: "Berlin Dub Techno" and "London Jungle". */
export function buildSceneFixtureDb(dbPath?: string): Database.Database {
  const db = dbPath ? openGraphDatabase(dbPath) : buildAggregatedTwoSceneDb();
  if (dbPath) {
    buildTwoSceneGraph(db);
    aggregate(
      db,
      { minGenreArtists: 2, minCityArtists: 2, minTagEvidence: 2, rosterSize: 12 },
      () => "2026-07-22T00:00:00.000Z",
    );
  }
  computeScenes(db, TEST_SCENE_CONFIG, () => "2026-07-22T12:00:00.000Z");
  return db;
}
