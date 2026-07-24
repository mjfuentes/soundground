import {
  DEFAULT_SCENE_NAMING_CONFIG,
  displayFromSpellings,
  nameScenes,
  type SceneDoc,
  type SceneNamingConfig,
} from "../scene-naming";

const config = (overrides: Partial<SceneNamingConfig> = {}): SceneNamingConfig => ({
  ...DEFAULT_SCENE_NAMING_CONFIG,
  minDocFrequency: 1,
  maxDocFraction: 1,
  minLocatedMembers: 2,
  minNameSupport: 1,
  nameSupportShare: 0,
  ...overrides,
});

const doc = (
  key: number,
  terms: Record<string, number>,
  topCity: SceneDoc["topCity"] = null,
  support: Record<string, number> = {},
): SceneDoc => ({
  key,
  termWeights: new Map(Object.entries(terms)),
  // Default: every term is broadly carried, so only the floor test opts in.
  termSupport: new Map(Object.keys(terms).map((term) => [term, support[term] ?? 99])),
  termedMembers: 100,
  topCity,
});

const display = displayFromSpellings(new Map([["dubtechno", "Dub Techno"]]));

describe("nameScenes", () => {
  it("names a scene by its distinctive term, not the ubiquitous one", () => {
    // "electronic" dominates every scene's counts; the max-document-fraction
    // filter keeps it out of the vocabulary entirely.
    const docs = [
      doc(1, { dubtechno: 40, electronic: 100 }),
      doc(2, { jungle: 40, electronic: 100 }),
      doc(3, { ambient: 40, electronic: 100 }),
    ];
    const names = nameScenes(docs, display, config({ maxDocFraction: 0.9 }));
    expect(names.get(1)?.name).toBe("Dub Techno");
    expect(names.get(2)?.name).toBe("Jungle");
    expect(names.get(1)?.tags).not.toContain("Electronic");
  });

  it("drops terms below the minimum document frequency", () => {
    const docs = [
      doc(1, { typo: 100, dubtechno: 50 }),
      doc(2, { dubtechno: 40 }),
      doc(3, { dubtechno: 30 }),
      doc(4, { jungle: 30 }),
    ];
    const names = nameScenes(docs, display, config({ minDocFrequency: 3 }));
    expect(names.get(1)?.name).toBe("Dub Techno");
    // "jungle" (df=1) fell out of vocabulary → scene 4 stays unnamed.
    expect(names.get(4)?.name).toBeNull();
  });

  it("never uses format terms", () => {
    const docs = [
      doc(1, { podcast: 500, dubtechno: 10 }),
      doc(2, { jungle: 10 }),
    ];
    const names = nameScenes(docs, display, config());
    expect(names.get(1)?.name).toBe("Dub Techno");
  });

  it("never uses year tags or platform podcast categories", () => {
    const docs = [
      doc(1, { "2026": 900, learning: 500, dubtechno: 10 }),
      doc(2, { jungle: 10 }),
    ];
    const names = nameScenes(docs, display, config());
    expect(names.get(1)?.name).toBe("Dub Techno");
    expect(names.get(1)?.tags).not.toContain("2026");
  });

  it("prefixes the dominant city", () => {
    const docs = [
      doc(1, { dubtechno: 40 }, { name: "Berlin", share: 0.6, locatedMembers: 10 }),
      doc(2, { jungle: 40 }),
    ];
    expect(nameScenes(docs, display, config()).get(1)?.name).toBe("Berlin Dub Techno");
  });

  it("skips the city prefix below the share threshold or with few located members", () => {
    const docs = [
      doc(1, { dubtechno: 40 }, { name: "Berlin", share: 0.3, locatedMembers: 10 }),
      doc(2, { jungle: 40 }, { name: "Tokyo", share: 0.9, locatedMembers: 1 }),
    ];
    const names = nameScenes(docs, display, config());
    expect(names.get(1)?.name).toBe("Dub Techno");
    expect(names.get(2)?.name).toBe("Jungle");
  });

  it("does not repeat the city as a term after the prefix", () => {
    const docs = [
      doc(1, { berlin: 100, dubtechno: 90 }, { name: "Berlin", share: 0.8, locatedMembers: 10 }),
      doc(2, { jungle: 40 }),
    ];
    expect(nameScenes(docs, display, config()).get(1)?.name).toBe("Berlin Dub Techno");
  });

  it("suppresses redundant sub-terms in the name", () => {
    // "techno" is contained in "dubtechno" — one idea, not two.
    const docs = [
      doc(1, { dubtechno: 50, techno: 45, ambient: 40 }),
      doc(2, { jungle: 10, techno: 5 }),
    ];
    const name = nameScenes(docs, display, config()).get(1)?.name;
    expect(name).toBe("Dub Techno · Ambient");
  });

  it("keeps weak secondary terms out of the name but in the tags", () => {
    const docs = [
      doc(1, { dubtechno: 100, dub: 60, ambient: 2 }),
      doc(2, { jungle: 50 }),
    ];
    const result = nameScenes(docs, display, config());
    expect(result.get(1)?.name).toBe("Dub Techno");
    expect(result.get(1)?.tags).toContain("Ambient");
  });

  it("refuses narrowly-supported terms as names but keeps them as tags", () => {
    // "fjaak" scores highest (distinctive, heavy taggers) but only 6 of
    // 100 termed members carry it; "dub techno" is the broad consensus.
    const docs = [
      doc(1, { fjaak: 500, dubtechno: 200 }, null, { fjaak: 6, dubtechno: 40 }),
      doc(2, { jungle: 50 }),
    ];
    const result = nameScenes(docs, display, config({ minNameSupport: 4, nameSupportShare: 0.08 }));
    expect(result.get(1)?.name).toBe("Dub Techno");
    expect(result.get(1)?.tags).toContain("Fjaak");
  });

  it("leaves a scene unnamed when nothing clears the breadth floor", () => {
    const docs = [
      doc(1, { fjaak: 500 }, null, { fjaak: 6 }),
      doc(2, { jungle: 50 }),
    ];
    const result = nameScenes(docs, display, config({ minNameSupport: 10 }));
    expect(result.get(1)?.name).toBeNull();
  });

  it("never uses stopwords or explicitly excluded hub names", () => {
    const docs = [
      doc(1, { the: 900, refugeworldwide: 500, dubtechno: 100 }),
      doc(2, { jungle: 50 }),
    ];
    const result = nameScenes(docs, display, config(), new Set(["refugeworldwide"]));
    expect(result.get(1)?.name).toBe("Dub Techno");
    expect(result.get(1)?.tags).not.toContain("The");
    expect(result.get(1)?.tags).not.toContain("Refugeworldwide");
  });

  it("gives a term naming rights only where the most members carry it", () => {
    // Doc 2 is a small promo cluster that tags dubtechno intensely (high
    // weight share) but with few carriers; doc 1 is the real community.
    const docs = [
      doc(1, { dubtechno: 500, ambient: 300 }, null, { dubtechno: 60, ambient: 40 }),
      doc(2, { dubtechno: 400, jungle: 90 }, null, { dubtechno: 7, jungle: 6 }),
      doc(3, { ambient: 100 }),
    ];
    const result = nameScenes(docs, display, config());
    expect(result.get(1)?.name).toContain("Dub Techno");
    expect(result.get(2)?.name).toBe("Jungle");
  });

  it("leaves scenes without vocabulary unnamed", () => {
    const docs = [doc(1, {}), doc(2, { jungle: 10 })];
    const result = nameScenes(docs, display, config());
    expect(result.get(1)?.name).toBeNull();
    expect(result.get(1)?.tags).toEqual([]);
  });

  it("falls back to a shared term rather than hiding a real circle", () => {
    // Doc 2's only broad term is owned by doc 1 — it still gets the name,
    // duplicated, instead of disappearing from the atlas.
    const docs = [
      doc(1, { dubtechno: 500 }, null, { dubtechno: 60 }),
      doc(2, { dubtechno: 300 }, null, { dubtechno: 20 }),
      doc(3, { jungle: 100 }),
    ];
    const result = nameScenes(docs, display, config());
    expect(result.get(1)?.name).toBe("Dub Techno");
    expect(result.get(2)?.name).toBe("Dub Techno");
  });

  it("prefers a relaxed place read over a shared term", () => {
    const docs = [
      doc(1, { dubtechno: 500 }, null, { dubtechno: 60 }),
      doc(
        2,
        { dubtechno: 300 },
        { name: "Melbourne", share: 0.3, locatedMembers: 20 },
        { dubtechno: 20 },
      ),
      doc(3, { jungle: 100 }),
    ];
    expect(nameScenes(docs, display, config()).get(2)?.name).toBe("Melbourne");
  });

  it("names a city-anchored circle by its place alone when no sound clears the floor", () => {
    const docs = [
      doc(1, {}, { name: "Amsterdam", share: 0.7, locatedMembers: 20 }),
      doc(2, { jungle: 10 }),
    ];
    expect(nameScenes(docs, display, config()).get(1)?.name).toBe("Amsterdam");
  });

  it("caps tags at the configured count", () => {
    const terms = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [`genre${i}`, 20 - i]),
    );
    const docs = [doc(1, terms), doc(2, { jungle: 5 })];
    expect(nameScenes(docs, display, config()).get(1)?.tags).toHaveLength(10);
  });
});

describe("displayFromSpellings", () => {
  it("prefers the observed spelling and falls back to title-cased fold", () => {
    expect(display("dubtechno")).toBe("Dub Techno");
    expect(display("jungle")).toBe("Jungle");
  });
});
