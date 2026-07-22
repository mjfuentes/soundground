import { openGraphDatabase } from "../database";
import { GraphRepository } from "../repository";
import {
  DEFAULT_EDGE_WEIGHT_CONFIG,
  directedStrengths,
  loadDirectedPairs,
  repostHubFactors,
  symmetrize,
  type DirectedPair,
} from "../edge-weights";

const pair = (overrides: Partial<DirectedPair>): DirectedPair => ({
  src: "a",
  dst: "b",
  follow: false,
  reposts: 0,
  ...overrides,
});

describe("loadDirectedPairs", () => {
  it("merges follow and repost rows into one directed pair", () => {
    const db = openGraphDatabase(":memory:");
    const repo = new GraphRepository(db, () => "2026-07-22T00:00:00.000Z");
    repo.recordEdge({ srcUrn: "a", dstUrn: "b", type: "follow", weight: 1, source: "t" });
    repo.recordEdge({ srcUrn: "a", dstUrn: "b", type: "repost", weight: 3, source: "t" });
    repo.recordEdge({ srcUrn: "b", dstUrn: "a", type: "follow", weight: 1, source: "t" });

    const pairs = loadDirectedPairs(db);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ src: "a", dst: "b", follow: true, reposts: 3 });
    expect(pairs).toContainEqual({ src: "b", dst: "a", follow: true, reposts: 0 });
    db.close();
  });
});

describe("repostHubFactors", () => {
  it("leaves sources at or under the cap undiscounted", () => {
    const pairs = [pair({ dst: "x", reposts: 1 }), pair({ dst: "y", reposts: 2 })];
    const factors = repostHubFactors(pairs, { repostHubCap: 2 });
    expect(factors.get("a")).toBe(1);
  });

  it("caps a promo hub's per-edge contribution at cap/degree", () => {
    const pairs = Array.from({ length: 8 }, (_, i) => pair({ dst: `t${i}`, reposts: 1 }));
    const factors = repostHubFactors(pairs, { repostHubCap: 2 });
    expect(factors.get("a")).toBe(0.25);
  });

  it("counts distinct targets, not repost volume", () => {
    // Many tracks by few artists is deep engagement, not promo spraying.
    const pairs = [pair({ dst: "x", reposts: 40 }), pair({ dst: "y", reposts: 40 })];
    const factors = repostHubFactors(pairs, { repostHubCap: 4 });
    expect(factors.get("a")).toBe(1);
  });

  it("ignores follow-only pairs when measuring repost degree", () => {
    const pairs = [
      pair({ dst: "x", reposts: 1 }),
      pair({ dst: "y", follow: true, reposts: 0 }),
      pair({ dst: "z", follow: true, reposts: 0 }),
    ];
    const factors = repostHubFactors(pairs, { repostHubCap: 1 });
    expect(factors.get("a")).toBe(1);
  });
});

describe("directedStrengths", () => {
  it("scores follow + log2(1+reposts), discounted by the source's hub factor", () => {
    const pairs = [
      pair({ src: "a", dst: "b", follow: true, reposts: 3 }),
      pair({ src: "hub", dst: "b", follow: false, reposts: 3 }),
    ];
    const strengths = directedStrengths(pairs, new Map([["hub", 0.5]]));
    expect(strengths.get("a")?.get("b")).toBe(1 + Math.log2(4));
    expect(strengths.get("hub")?.get("b")).toBe(0.5 * Math.log2(4));
  });

  it("never discounts the follow component", () => {
    const pairs = [pair({ src: "hub", dst: "b", follow: true, reposts: 1 })];
    const strengths = directedStrengths(pairs, new Map([["hub", 0.25]]));
    expect(strengths.get("hub")?.get("b")).toBe(1 + 0.25 * Math.log2(2));
  });
});

describe("symmetrize", () => {
  it("sums both directions and adds a reciprocity bonus of the weaker side", () => {
    const strengths = new Map([
      ["a", new Map([["b", 2]])],
      ["b", new Map([["a", 1]])],
    ]);
    const edges = symmetrize(strengths);
    expect(edges).toEqual([{ u: "a", v: "b", weight: 2 + 1 + 1 }]);
  });

  it("gives one-way ties no bonus", () => {
    const strengths = new Map([["a", new Map([["b", 2]])]]);
    expect(symmetrize(strengths)).toEqual([{ u: "a", v: "b", weight: 2 }]);
  });

  it("emits each undirected pair exactly once", () => {
    const strengths = new Map([
      ["b", new Map([["a", 1]])],
      ["a", new Map([["b", 1]])],
    ]);
    const edges = symmetrize(strengths);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ u: "a", v: "b", weight: 3 });
  });
});

describe("DEFAULT_EDGE_WEIGHT_CONFIG", () => {
  it("keeps the cap above the observed median source (22 distinct targets)", () => {
    expect(DEFAULT_EDGE_WEIGHT_CONFIG.repostHubCap).toBeGreaterThanOrEqual(30);
  });
});
