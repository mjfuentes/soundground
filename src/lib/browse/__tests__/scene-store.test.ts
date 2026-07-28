import fs from "fs";
import os from "os";
import path from "path";
import { buildSceneFixtureDb } from "@/lib/graph/__tests__/two-scene-fixture";
import { classifySceneHome, getSceneDetail, listScenes, scenesForGenre } from "../scene-store";
import { __resetStoreForTests, getBrowseStatus, listBrowseIndex } from "../store";

// Fixture's latest upload is 2026-07-21T18:00 (artist 2, dub techno).
const NOW = new Date("2026-07-22T00:00:00.000Z").getTime();

describe("scene store", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-scene-store-"));
    const dbPath = path.join(dir, "graph.db");
    buildSceneFixtureDb(dbPath).close();
    process.env.GRAPH_DB_PATH = dbPath;
    __resetStoreForTests();
  });

  afterEach(() => {
    __resetStoreForTests();
    delete process.env.GRAPH_DB_PATH;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("lists named scenes largest first with tags and activity", () => {
    const scenes = listScenes(NOW);
    expect(scenes.map((scene) => scene.name).sort()).toEqual([
      "Berlin Dub Techno",
      "London Jungle",
    ]);
    const berlin = scenes.find((scene) => scene.name === "Berlin Dub Techno")!;
    expect(berlin.slug).toBe("berlin-dub-techno");
    expect(berlin.cityName).toBe("Berlin");
    expect(berlin.memberCount).toBe(5);
    expect(berlin.tags).toContain("Dub Techno");
    expect(berlin.activity).toBe("active now");
    // Mosaic covers: every rosterable member surfaces (fixture has 6).
    expect(berlin.coverUrns).toHaveLength(6);
  });

  it("returns scene detail with ranked roster, genres, and cities", () => {
    const detail = getSceneDetail("berlin-dub-techno", NOW);
    expect(detail).not.toBeNull();
    // Artist 2 leads on within-scene in-degree (peer reposts), not followers.
    expect(detail!.roster[0].urn).toBe("soundcloud:users:2");
    // The radio-station hub is split out of the roster.
    expect(detail!.hubs.map((hub) => hub.urn)).toEqual(["soundcloud:users:23"]);
    expect(detail!.genres).toContainEqual(
      expect.objectContaining({ slug: "dub-techno", name: "Dub Techno" }),
    );
    expect(detail!.cities).toContainEqual(
      expect.objectContaining({ slug: "berlin", name: "Berlin" }),
    );
    // All 5 crawled members are in Berlin → a place circle (ideas/0005).
    expect(detail!.home).toEqual(
      expect.objectContaining({ kind: "place", city: "Berlin", label: "A Berlin scene" }),
    );
  });

  it("returns null for unknown scenes", () => {
    expect(getSceneDetail("nope", NOW)).toBeNull();
  });

  it("finds the scenes inside a genre by member overlap", () => {
    const scenes = scenesForGenre("dub-techno");
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toEqual(
      expect.objectContaining({ slug: "berlin-dub-techno", name: "Berlin Dub Techno" }),
    );
  });

  it("counts scenes in browse status and lists them in the index", () => {
    expect(getBrowseStatus().sceneCount).toBe(2);
    const index = listBrowseIndex();
    expect(index).toContainEqual({
      kind: "circle",
      slug: "berlin-dub-techno",
      name: "Berlin Dub Techno",
    });
  });

  it("degrades to empty results when scene tables are absent", () => {
    // Simulate an older database: drop the scene tables entirely.
    const dbPath = path.join(dir, "graph.db");
    const Database = jest.requireActual<typeof import("better-sqlite3")>("better-sqlite3");
    const raw = new Database(dbPath);
    raw.exec(`DROP TABLE scene_members; DROP TABLE scenes;`);
    raw.close();
    __resetStoreForTests();

    expect(listScenes(NOW)).toEqual([]);
    expect(getSceneDetail("berlin-dub-techno", NOW)).toBeNull();
    expect(scenesForGenre("dub-techno")).toEqual([]);
    expect(getBrowseStatus().sceneCount).toBe(0);
  });
});

describe("classifySceneHome", () => {
  it("calls a strongly concentrated circle a place scene", () => {
    // 300 members, 150 located, 60 in the top city → 40% share.
    expect(classifySceneHome(300, 150, "São Paulo", 60)).toEqual(
      expect.objectContaining({ kind: "place", city: "São Paulo", label: "A São Paulo scene" }),
    );
  });

  it("calls a moderately concentrated circle centered on its hub", () => {
    // 24% top-city share → tinted, with the share spelled out.
    const home = classifySceneHome(800, 200, "Berlin", 48);
    expect(home.kind).toBe("tinted");
    expect(home.label).toBe("Centered on Berlin (24% of located members)");
  });

  it("calls a dispersed circle placeless", () => {
    // 16% top-city share → below the tinted floor.
    expect(classifySceneHome(1300, 500, "London", 80)).toEqual(
      expect.objectContaining({ kind: "global", city: null }),
    );
  });

  it("withholds a home when geodata is too sparse to trust", () => {
    // Only 8% of members declare a city — below the coverage floor.
    expect(classifySceneHome(1000, 80, "Berlin", 60).kind).toBe("global");
    // And when almost nobody is located at all.
    expect(classifySceneHome(1000, 3, "Berlin", 3).kind).toBe("global");
  });

  it("is placeless when there is no top city", () => {
    expect(classifySceneHome(300, 150, null, 0).kind).toBe("global");
  });
});
