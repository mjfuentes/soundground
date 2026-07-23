import fs from "fs";
import os from "os";
import path from "path";
import {
  __resetStoreForTests,
  getBrowseStatus,
  getCityDetail,
  getGenreDetail,
  getSoundInPlace,
  listCities,
  listGenres,
} from "../store";
import { buildAggregatedFixture } from "./fixtures";

// Activity is computed relative to `now`; fixture's latest upload is 2026-07-21.
const NOW = new Date("2026-07-21T06:00:00.000Z").getTime();

describe("browse store", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-store-"));
    const dbPath = path.join(dir, "graph.db");
    buildAggregatedFixture(undefined, dbPath).close();
    process.env.GRAPH_DB_PATH = dbPath;
    __resetStoreForTests();
  });

  afterEach(() => {
    __resetStoreForTests();
    delete process.env.GRAPH_DB_PATH;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reports status from aggregated data", () => {
    expect(getBrowseStatus()).toEqual({
      hasData: true,
      aggregatedAt: "2026-07-21T12:00:00.000Z",
      genreCount: 2,
      cityCount: 1,
      sceneCount: 0,
    });
  });

  it("lists genres by artist count with related names and top city", () => {
    const genres = listGenres(NOW);
    expect(genres[0]).toEqual(
      expect.objectContaining({
        slug: "dub-techno",
        name: "Dub Techno",
        artistCount: 3,
        topCity: "Berlin",
        relatedNames: ["Ambient"],
      }),
    );
  });

  it("derives activity from member upload recency", () => {
    const genres = listGenres(NOW);
    const dubTechno = genres.find((g) => g.slug === "dub-techno");
    expect(dubTechno?.activity).toBe("active now");
    expect(dubTechno?.activeNow).toBe(true);

    const weekLater = listGenres(NOW + 3 * 24 * 60 * 60 * 1000);
    expect(weekLater.find((g) => g.slug === "dub-techno")?.activity).toBe("1 this week");
  });

  it("returns genre detail with roster, cities, related", () => {
    const detail = getGenreDetail("dub-techno", NOW);
    expect(detail?.roster).toHaveLength(3);
    expect(detail?.roster[0].urn).toBe("soundcloud:users:1");
    expect(detail?.roster[0].otherGenres).toEqual(["Ambient"]);
    expect(detail?.cities).toContainEqual({ slug: "berlin", name: "Berlin", count: 2 });
    expect(detail?.related).toContainEqual(
      expect.objectContaining({ slug: "ambient", name: "Ambient" }),
    );
  });

  it("returns the sound-in-place intersection ranked by reach", () => {
    const detail = getSoundInPlace("dub-techno", "berlin");
    expect(detail).not.toBeNull();
    expect(detail!.genreName).toBe("Dub Techno");
    expect(detail!.cityName).toBe("Berlin");
    // Artists 1 and 2 are the Berlin dub techno members; 3 is in Tokyo.
    expect(detail!.roster.map((artist) => artist.urn)).toEqual([
      "soundcloud:users:1",
      "soundcloud:users:2",
    ]);
    expect(detail!.artistCount).toBe(2);
  });

  it("returns null for unknown or empty intersections", () => {
    expect(getSoundInPlace("polka", "berlin")).toBeNull();
    expect(getSoundInPlace("jungle", "berlin")).toBeNull();
  });

  it("returns city detail with genres and roster", () => {
    const detail = getCityDetail("berlin", NOW);
    expect(detail?.artistCount).toBe(3);
    // Dub Techno and Ambient tie at 2 members; alphabetical tie-break wins.
    expect(detail?.topGenre).toBe("Ambient");
    expect(detail?.genres).toContainEqual(
      expect.objectContaining({ slug: "dub-techno", count: 2 }),
    );
    expect(detail?.roster.map((a) => a.urn)).toContain("soundcloud:users:1");
  });

  it("returns null for unknown slugs", () => {
    expect(getGenreDetail("polka", NOW)).toBeNull();
    expect(getCityDetail("atlantis", NOW)).toBeNull();
  });

  it("degrades to empty when the database is missing", () => {
    process.env.GRAPH_DB_PATH = path.join(dir, "nope.db");
    __resetStoreForTests();
    expect(getBrowseStatus().hasData).toBe(false);
    expect(listGenres(NOW)).toEqual([]);
    expect(listCities(NOW)).toEqual([]);
    expect(getGenreDetail("dub-techno", NOW)).toBeNull();
  });
});
