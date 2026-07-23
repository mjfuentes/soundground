import type Database from "better-sqlite3";
import { GraphRepository } from "@/lib/graph/repository";
import { aggregate } from "../aggregate";
import type { CityCanon } from "../canon";
import { buildFixtureGraph, FIXTURE_CONFIG } from "./fixtures";

describe("aggregate", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = buildFixtureGraph();
  });

  afterEach(() => {
    db.close();
  });

  const run = (canon?: CityCanon) =>
    aggregate(db, FIXTURE_CONFIG, () => "2026-07-21T12:00:00.000Z", canon);

  const addArtist = (id: number, city: string) => {
    new GraphRepository(db, () => "2026-07-20T00:00:00.000Z").upsertArtist({
      urn: `soundcloud:users:${id}`,
      permalink: `artist-${id}`,
      cityRaw: city,
      depth: 1,
    });
  };

  it("merges spelling variants into one genre with the dominant spelling title-cased", () => {
    run();
    const genres = db.prepare(`SELECT slug, name, artist_count FROM browse_genres ORDER BY artist_count DESC`).all();
    expect(genres).toContainEqual({ slug: "dub-techno", name: "Dub Techno", artist_count: 3 });
  });

  it("keeps below-threshold terms out and reports them", () => {
    const report = run();
    const jungle = db.prepare(`SELECT * FROM browse_genres WHERE slug = 'jungle'`).get();
    expect(jungle).toBeUndefined();
    expect(report.belowThresholdGenreTerms).toContainEqual({ term: "jungle", artists: 1 });
  });

  it("merges city spelling variants and majority-votes the country", () => {
    run();
    const berlin = db.prepare(`SELECT * FROM browse_cities WHERE slug = 'berlin'`).get() as Record<string, unknown>;
    expect(berlin.name).toBe("Berlin");
    expect(berlin.country).toBe("DE");
    expect(berlin.artist_count).toBe(3);
  });

  it("never lets hub names become genres", () => {
    // Both artists declare genre "Rinse FM" — a radio's name, not a sound.
    const repo = new GraphRepository(db, () => "2026-07-20T00:00:00.000Z");
    for (const id of [1, 2, 3]) {
      repo.recordTerm({
        artistUrn: `soundcloud:users:${id}`,
        term: "rinse fm",
        kind: "genre",
        evidence: 3,
      });
    }
    aggregate(db, FIXTURE_CONFIG, () => "2026-07-21T12:00:00.000Z", undefined, {
      hubPermalinks: new Set(["rinsefm"]),
      hubTermFolds: new Set(),
      artistPermalinks: new Set(),
    });
    expect(db.prepare(`SELECT * FROM browse_genres WHERE slug = 'rinse-fm'`).get()).toBeUndefined();
  });

  it("merges canon aliases under the canonical name", () => {
    addArtist(31, "NYC");
    addArtist(32, "New York");
    addArtist(33, "new york city");
    run({
      nonPlaces: new Set(),
      aliases: new Map([
        ["nyc", "New York"],
        ["newyorkcity", "New York"],
      ]),
    });
    const newYork = db
      .prepare(`SELECT * FROM browse_cities WHERE slug = 'new-york'`)
      .get() as Record<string, unknown>;
    expect(newYork.name).toBe("New York");
    expect(newYork.artist_count).toBe(3);
    expect(db.prepare(`SELECT * FROM browse_cities WHERE slug = 'nyc'`).get()).toBeUndefined();
  });

  it("drops non-places from geography but keeps the artists browsable", () => {
    addArtist(41, "Worldwide");
    addArtist(42, "Worldwide");
    const canon: CityCanon = { nonPlaces: new Set(["worldwide"]), aliases: new Map() };
    const report = run(canon);
    expect(
      db.prepare(`SELECT * FROM browse_cities WHERE slug = 'worldwide'`).get(),
    ).toBeUndefined();
    expect(
      db.prepare(`SELECT * FROM artist_cities WHERE artist_urn = 'soundcloud:users:41'`).get(),
    ).toBeUndefined();
    // Non-places never surface in the below-threshold curation report either.
    expect(report.belowThresholdCities.map((c) => c.city)).not.toContain("Worldwide");
  });

  it("excludes below-threshold cities", () => {
    const report = run();
    expect(db.prepare(`SELECT * FROM browse_cities WHERE slug = 'tokyo'`).get()).toBeUndefined();
    expect(report.belowThresholdCities).toContainEqual({ city: "Tokyo", artists: 1 });
  });

  it("ranks rosters by followers, carrying engagement and connections", () => {
    run();
    const row = db.prepare(`SELECT roster FROM browse_genres WHERE slug = 'dub-techno'`).get() as {
      roster: string;
    };
    const roster = JSON.parse(row.roster) as {
      urn: string;
      followers: number;
      plays: number;
      connections: number;
    }[];
    // followers: 1 (5000) > 2 (2000) > 3 (100)
    expect(roster.map((r) => r.urn)).toEqual([
      "soundcloud:users:1",
      "soundcloud:users:2",
      "soundcloud:users:3",
    ]);
    expect(roster[0].plays).toBe(15000);
    expect(roster[0].connections).toBeGreaterThan(0);
  });

  it("previews an artist only under their top-evidence genres", () => {
    // Artist 10 concentrates in "housey" (evidence 9/8) with a stray "breaky"
    // tag; artists 11-13 are primarily breaky. 10 must not preview in breaky.
    const urn = (id: number) => `soundcloud:users:${id}`;
    const { GraphRepository } = jest.requireActual<typeof import("@/lib/graph/repository")>(
      "@/lib/graph/repository",
    );
    const repo = new GraphRepository(db);
    for (const id of [10, 11, 12, 13]) {
      repo.upsertArtist({ urn: urn(id), permalink: `a${id}`, trackCount: 5, followersCount: 9000, depth: 0 });
    }
    repo.recordTerm({ artistUrn: urn(10), term: "housey", kind: "genre", evidence: 9 });
    repo.recordTerm({ artistUrn: urn(10), term: "garagey", kind: "genre", evidence: 8 });
    repo.recordTerm({ artistUrn: urn(10), term: "breaky", kind: "genre", evidence: 1 });
    for (const id of [11, 12, 13]) {
      repo.recordTerm({ artistUrn: urn(id), term: "breaky", kind: "genre", evidence: 5 });
      repo.recordTerm({ artistUrn: urn(10 + ((id + 1) % 3)), term: "housey", kind: "genre", evidence: 1 });
    }
    // make housey/garagey/breaky qualify (threshold 2)
    repo.recordTerm({ artistUrn: urn(11), term: "housey", kind: "genre", evidence: 2 });
    repo.recordTerm({ artistUrn: urn(12), term: "garagey", kind: "genre", evidence: 2 });

    run();

    const breaky = db.prepare(`SELECT roster, artist_count FROM browse_genres WHERE slug = 'breaky'`).get() as
      | { roster: string; artist_count: number }
      | undefined;
    expect(breaky).toBeDefined();
    const rosterUrns = (JSON.parse(breaky!.roster) as { urn: string }[]).map((r) => r.urn);
    // artist 10 BELONGS to breaky (counted) but is not PREVIEWED there
    expect(breaky!.artist_count).toBe(4);
    expect(rosterUrns).not.toContain(urn(10));
    expect(rosterUrns).toEqual(expect.arrayContaining([urn(11), urn(12), urn(13)]));
  });

  it("records genre×city intersections", () => {
    run();
    const pair = db
      .prepare(`SELECT artist_count FROM browse_genre_city WHERE genre_slug = 'dub-techno' AND city_slug = 'berlin'`)
      .get();
    expect(pair).toEqual({ artist_count: 2 });
  });

  it("links related genres by shared artists symmetrically", () => {
    run();
    const related = db
      .prepare(`SELECT related_slug, shared_artists FROM browse_related_genres WHERE genre_slug = 'dub-techno'`)
      .all();
    expect(related).toContainEqual({ related_slug: "ambient", shared_artists: 2 });
    const inverse = db
      .prepare(`SELECT shared_artists FROM browse_related_genres WHERE genre_slug = 'ambient' AND related_slug = 'dub-techno'`)
      .get();
    expect(inverse).toEqual({ shared_artists: 2 });
  });

  it("excludes format terms and city-name collisions from genres, with a report", () => {
    const { GraphRepository } = jest.requireActual<typeof import("@/lib/graph/repository")>(
      "@/lib/graph/repository",
    );
    const repo = new GraphRepository(db);
    const urn = (id: number) => `soundcloud:users:${id}`;
    for (const id of [20, 21, 22]) {
      repo.upsertArtist({ urn: urn(id), permalink: `a${id}`, trackCount: 5, cityRaw: "Tokyo", depth: 0 });
      repo.recordTerm({ artistUrn: urn(id), term: "podcast", kind: "genre", evidence: 3 });
      repo.recordTerm({ artistUrn: urn(id), term: "tokyo", kind: "genre", evidence: 3 });
    }
    const report = run();

    expect(db.prepare(`SELECT * FROM browse_genres WHERE slug = 'podcast'`).get()).toBeUndefined();
    expect(db.prepare(`SELECT * FROM browse_genres WHERE slug = 'tokyo'`).get()).toBeUndefined();
    // Tokyo still exists as a CITY (now 4 artists: fixture artist 3 + these)
    expect(db.prepare(`SELECT artist_count FROM browse_cities WHERE slug = 'tokyo'`).get()).toEqual({
      artist_count: 4,
    });
    expect(report.excludedGenreTerms).toContainEqual({ term: "podcast", artists: 3, reason: "format" });
    expect(report.excludedGenreTerms).toContainEqual({ term: "tokyo", artists: 3, reason: "city" });
  });

  it("merges comma-suffixed city variants into the base city", () => {
    const { GraphRepository } = jest.requireActual<typeof import("@/lib/graph/repository")>(
      "@/lib/graph/repository",
    );
    const repo = new GraphRepository(db);
    repo.upsertArtist({
      urn: "soundcloud:users:30",
      permalink: "a30",
      cityRaw: "Berlin, Germany",
      trackCount: 3,
      depth: 0,
    });
    run();
    const berlin = db.prepare(`SELECT artist_count FROM browse_cities WHERE slug = 'berlin'`).get();
    expect(berlin).toEqual({ artist_count: 4 }); // 3 fixture + comma variant
    expect(db.prepare(`SELECT * FROM browse_cities WHERE name LIKE '%Germany%'`).get()).toBeUndefined();
  });

  it("ranks related genres by affinity, not raw overlap", () => {
    const { GraphRepository } = jest.requireActual<typeof import("@/lib/graph/repository")>(
      "@/lib/graph/repository",
    );
    const repo = new GraphRepository(db);
    const urn = (id: number) => `soundcloud:users:${id}`;
    // "bigg" is huge (10 artists), sharing 2 with dub techno; "smol" is tiny
    // (2 artists), both shared with dub techno → smol has higher affinity.
    for (let id = 40; id < 50; id++) {
      repo.upsertArtist({ urn: urn(id), permalink: `a${id}`, trackCount: 5, depth: 0 });
      repo.recordTerm({ artistUrn: urn(id), term: "bigg", kind: "genre", evidence: 3 });
    }
    repo.recordTerm({ artistUrn: urn(1), term: "bigg", kind: "genre", evidence: 2 });
    repo.recordTerm({ artistUrn: urn(2), term: "bigg", kind: "genre", evidence: 2 });
    repo.recordTerm({ artistUrn: urn(1), term: "smol", kind: "genre", evidence: 2 });
    repo.recordTerm({ artistUrn: urn(2), term: "smol", kind: "genre", evidence: 2 });
    run();

    const related = db
      .prepare(
        `SELECT related_slug, affinity FROM browse_related_genres
         WHERE genre_slug = 'dub-techno' ORDER BY affinity DESC`,
      )
      .all() as { related_slug: string; affinity: number }[];
    const smol = related.find((r) => r.related_slug === "smol");
    const bigg = related.find((r) => r.related_slug === "bigg");
    expect(smol && bigg && smol.affinity > bigg.affinity).toBe(true);
  });

  it("is idempotent — rerunning produces identical tables", () => {
    run();
    const first = db.prepare(`SELECT * FROM browse_genres ORDER BY slug`).all();
    run();
    const second = db.prepare(`SELECT * FROM browse_genres ORDER BY slug`).all();
    expect(second).toEqual(first);
  });

  it("stamps aggregation metadata", () => {
    run();
    const meta = db.prepare(`SELECT value FROM browse_meta WHERE key = 'aggregated_at'`).get();
    expect(meta).toEqual({ value: "2026-07-21T12:00:00.000Z" });
  });
});
