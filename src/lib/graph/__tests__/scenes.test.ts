import type Database from "better-sqlite3";
import { aggregate } from "@/lib/browse/aggregate";
import { openGraphDatabase } from "../database";
import { GraphRepository } from "../repository";
import { computeScenes, DEFAULT_SCENE_COMPUTE_CONFIG, type SceneComputeConfig } from "../scenes";
import type { RosterEntry } from "@/lib/browse/aggregate";

const urn = (id: number) => `soundcloud:users:${id}`;

const TEST_CONFIG: SceneComputeConfig = {
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

/**
 * Two communities: a Berlin dub techno circle (1–5, crawled, plus frontier
 * artist 21 and zero-track account 22) and a London jungle circle (11–15,
 * crawled), joined by a single weak bridge follow.
 */
function buildTwoSceneGraph(db: Database.Database): void {
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

function buildAggregatedTwoSceneDb(): Database.Database {
  const db = openGraphDatabase(":memory:");
  buildTwoSceneGraph(db);
  aggregate(
    db,
    { minGenreArtists: 2, minCityArtists: 2, minTagEvidence: 2, rosterSize: 12 },
    () => "2026-07-22T00:00:00.000Z",
  );
  return db;
}

interface SceneRow {
  id: number;
  slug: string | null;
  name: string | null;
  city_name: string | null;
  tags: string;
  member_count: number;
  total_count: number;
  roster: string;
}

const readScenes = (db: Database.Database): SceneRow[] =>
  db.prepare(`SELECT * FROM scenes ORDER BY member_count DESC, id`).all() as SceneRow[];

describe("computeScenes", () => {
  it("detects, names, and persists the two scenes", () => {
    const db = buildAggregatedTwoSceneDb();
    const report = computeScenes(db, TEST_CONFIG, () => "2026-07-22T12:00:00.000Z");

    expect(report.scenes).toBe(2);
    expect(report.named).toBe(2);

    const scenes = readScenes(db);
    const names = scenes.map((scene) => scene.name).sort();
    expect(names).toEqual(["Berlin Dub Techno", "London Jungle"]);
    const berlin = scenes.find((scene) => scene.name === "Berlin Dub Techno")!;
    expect(berlin.slug).toBe("berlin-dub-techno");
    expect(berlin.city_name).toBe("Berlin");
    expect(JSON.parse(berlin.tags)).toContain("Dub Techno");
    db.close();
  });

  it("counts only crawled members but keeps the frontier in totals", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);

    const berlin = readScenes(db).find((scene) => scene.name === "Berlin Dub Techno")!;
    expect(berlin.member_count).toBe(5); // 21 and 22 are uncrawled
    expect(berlin.total_count).toBe(7);
    db.close();
  });

  it("ranks the roster by within-scene in-degree, not followers", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);

    const berlin = readScenes(db).find((scene) => scene.name === "Berlin Dub Techno")!;
    const roster = JSON.parse(berlin.roster) as RosterEntry[];
    // Artist 1 has 90k followers; artist 2 has the reposts from peers.
    expect(roster[0].urn).toBe(urn(2));
    expect(roster[0].connections).toBeGreaterThan(roster[1].connections);
    db.close();
  });

  it("excludes zero-track accounts from rosters but not membership", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);

    const berlin = readScenes(db).find((scene) => scene.name === "Berlin Dub Techno")!;
    const rosterUrns = (JSON.parse(berlin.roster) as RosterEntry[]).map((entry) => entry.urn);
    expect(rosterUrns).not.toContain(urn(22));
    const members = db
      .prepare(`SELECT artist_urn FROM scene_members WHERE scene_id = ?`)
      .all(berlin.id) as { artist_urn: string }[];
    expect(members.map((m) => m.artist_urn)).toContain(urn(22));
    db.close();
  });

  it("keeps scene IDs stable across re-runs as membership drifts", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);
    const before = readScenes(db);
    const berlinId = before.find((scene) => scene.name === "Berlin Dub Techno")!.id;
    const londonId = before.find((scene) => scene.name === "London Jungle")!.id;

    // A newcomer joins the jungle circle; scenes must keep their IDs.
    const repo = new GraphRepository(db, () => "2026-07-23T00:00:00.000Z");
    repo.upsertArtist({ urn: urn(16), permalink: "artist-16", trackCount: 5, depth: 1 });
    for (const peer of [11, 12, 13]) {
      repo.recordEdge({ srcUrn: urn(peer), dstUrn: urn(16), type: "follow", weight: 1, source: "t" });
      repo.recordEdge({ srcUrn: urn(16), dstUrn: urn(peer), type: "follow", weight: 1, source: "t" });
    }
    computeScenes(db, TEST_CONFIG);

    const after = readScenes(db);
    expect(after.find((scene) => scene.name === "Berlin Dub Techno")!.id).toBe(berlinId);
    expect(after.find((scene) => scene.name === "London Jungle")!.id).toBe(londonId);
    db.close();
  });

  it("names scenes without city prefixes when aggregation has not run", () => {
    const db = openGraphDatabase(":memory:");
    buildTwoSceneGraph(db);
    const report = computeScenes(db, TEST_CONFIG);

    expect(report.named).toBe(2);
    const names = readScenes(db)
      .map((scene) => scene.name)
      .sort();
    expect(names).toEqual(["Dub Techno", "Jungle"]);
    db.close();
  });

  it("reports unnamed scenes and excludes them from the largest list", () => {
    const db = openGraphDatabase(":memory:");
    buildTwoSceneGraph(db);
    // Strip all terms: no vocabulary, nothing can be named.
    db.prepare(`DELETE FROM artist_terms`).run();
    const report = computeScenes(db, TEST_CONFIG);

    expect(report.named).toBe(0);
    expect(report.unnamedScenes).toHaveLength(2);
    expect(report.largest).toHaveLength(0);
    for (const scene of readScenes(db)) {
      expect(scene.name).toBeNull();
      expect(scene.slug).toBeNull();
    }
    db.close();
  });

  it("handles an empty graph", () => {
    const db = openGraphDatabase(":memory:");
    const report = computeScenes(db, TEST_CONFIG);
    expect(report.scenes).toBe(0);
    expect(readScenes(db)).toHaveLength(0);
    db.close();
  });
});
