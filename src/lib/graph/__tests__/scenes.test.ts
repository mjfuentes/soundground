import type Database from "better-sqlite3";
import type { RosterEntry } from "@/lib/browse/aggregate";
import { openGraphDatabase } from "../database";
import { GraphRepository } from "../repository";
import { computeScenes } from "../scenes";
import {
  buildAggregatedTwoSceneDb,
  buildTwoSceneGraph,
  TEST_SCENE_CONFIG as TEST_CONFIG,
  urn,
} from "./two-scene-fixture";

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

  it("counts only crawled artist members but keeps the frontier in totals", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);

    const berlin = readScenes(db).find((scene) => scene.name === "Berlin Dub Techno")!;
    expect(berlin.member_count).toBe(5); // 21/22 uncrawled, 23 is a hub
    expect(berlin.total_count).toBe(8);
    db.close();
  });

  it("splits hubs out of the roster and never lets their tags name the scene", () => {
    const db = buildAggregatedTwoSceneDb();
    computeScenes(db, TEST_CONFIG);

    const berlin = readScenes(db).find((scene) => scene.name === "Berlin Dub Techno")!;
    const rosterUrns = (JSON.parse(berlin.roster) as RosterEntry[]).map((entry) => entry.urn);
    expect(rosterUrns).not.toContain(urn(23));
    const hubUrns = (JSON.parse((berlin as SceneRow & { hubs: string }).hubs) as RosterEntry[]).map(
      (entry) => entry.urn,
    );
    expect(hubUrns).toEqual([urn(23)]);
    // The hub's 50-evidence "pirateradio" tag must not surface anywhere.
    expect(JSON.parse(berlin.tags)).not.toContain("Pirateradio");
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

  it("assigns collision-free slugs even against suffixed names", () => {
    const { assignSlugs } = jest.requireActual<typeof import("../scenes")>("../scenes");
    // "Techno 5"'s base slug collides with the suffixed fallback of the
    // second "Techno" (id 5) — the fallback must keep incrementing.
    const slugs = assignSlugs([
      { id: 42, name: "Techno 5" },
      { id: 1, name: "Techno" },
      { id: 5, name: "Techno" },
      { id: 7, name: null },
    ]);
    const named = [slugs.get(42), slugs.get(1), slugs.get(5)];
    expect(new Set(named).size).toBe(3);
    expect(named).toContain("techno-5");
    expect(slugs.get(7)).toBeNull();
  });

  it("handles an empty graph", () => {
    const db = openGraphDatabase(":memory:");
    const report = computeScenes(db, TEST_CONFIG);
    expect(report.scenes).toBe(0);
    expect(readScenes(db)).toHaveLength(0);
    db.close();
  });
});
