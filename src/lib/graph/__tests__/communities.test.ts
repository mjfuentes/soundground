import {
  buildSceneGraph,
  DEFAULT_COMMUNITY_CONFIG,
  detectCommunities,
  partitionStats,
  pickPartition,
  seededRng,
  type CommunityConfig,
  type PartitionStats,
} from "../communities";
import type { SymmetricEdge } from "../edge-weights";

const edge = (u: string, v: string, weight = 1): SymmetricEdge => ({ u, v, weight });

/** Fully connected cluster among the given nodes. */
function clique(prefix: string, size: number, weight = 3): SymmetricEdge[] {
  const edges: SymmetricEdge[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      edges.push(edge(`${prefix}${i}`, `${prefix}${j}`, weight));
    }
  }
  return edges;
}

const testConfig = (overrides: Partial<CommunityConfig>): CommunityConfig => ({
  ...DEFAULT_COMMUNITY_CONFIG,
  dustThreshold: 3,
  ...overrides,
});

describe("seededRng", () => {
  it("is deterministic per seed", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("buildSceneGraph", () => {
  it("builds an undirected weighted graph without self-loops", () => {
    const graph = buildSceneGraph([edge("a", "b", 2.5), edge("a", "a", 9)]);
    expect(graph.order).toBe(2);
    expect(graph.size).toBe(1);
    expect(graph.getEdgeAttribute("a", "b", "weight")).toBe(2.5);
  });
});

describe("partitionStats", () => {
  it("computes largest fraction and non-dust median", () => {
    const stats = partitionStats([50, 10, 30, 2], 100, 1, 10);
    expect(stats.communityCount).toBe(4);
    expect(stats.largestFraction).toBe(0.5);
    expect(stats.medianSceneSize).toBe(30);
  });

  it("reports median 0 when every community is dust", () => {
    expect(partitionStats([2, 3], 5, 1, 10).medianSceneSize).toBe(0);
  });
});

describe("pickPartition", () => {
  const stats = (overrides: Partial<PartitionStats>): PartitionStats => ({
    resolution: 1,
    communityCount: 10,
    largestFraction: 0.05,
    medianSceneSize: 100,
    ...overrides,
  });

  it("rejects partitions with an oversize largest community", () => {
    const sweep = [
      stats({ resolution: 0.5, largestFraction: 0.6, medianSceneSize: 500 }),
      stats({ resolution: 2, largestFraction: 0.08, medianSceneSize: 5000 }),
    ];
    expect(pickPartition(sweep, DEFAULT_COMMUNITY_CONFIG)).toBe(1);
  });

  it("prefers the median inside the target range", () => {
    const sweep = [
      stats({ resolution: 0.5, medianSceneSize: 4000 }),
      stats({ resolution: 2, medianSceneSize: 300 }),
    ];
    expect(pickPartition(sweep, DEFAULT_COMMUNITY_CONFIG)).toBe(1);
  });

  it("breaks ties toward the lower resolution", () => {
    const sweep = [
      stats({ resolution: 2, medianSceneSize: 300 }),
      stats({ resolution: 0.5, medianSceneSize: 300 }),
    ];
    expect(pickPartition(sweep, DEFAULT_COMMUNITY_CONFIG)).toBe(1);
  });

  it("falls back to the smallest largest-community when nothing qualifies", () => {
    const sweep = [
      stats({ resolution: 0.5, largestFraction: 0.9, medianSceneSize: 100 }),
      stats({ resolution: 1, largestFraction: 0.4, medianSceneSize: 100 }),
    ];
    expect(pickPartition(sweep, DEFAULT_COMMUNITY_CONFIG)).toBe(1);
  });
});

describe("detectCommunities", () => {
  it("separates two dense cliques joined by a weak bridge", () => {
    const edges = [...clique("a", 5), ...clique("b", 5), edge("a0", "b0", 0.5)];
    const result = detectCommunities(
      buildSceneGraph(edges),
      testConfig({ resolutions: [1] }),
    );
    expect(result.scenes).toHaveLength(2);
    const memberSets = result.scenes.map((scene) => [...scene].sort());
    expect(memberSets).toContainEqual(["a0", "a1", "a2", "a3", "a4"]);
    expect(memberSets).toContainEqual(["b0", "b1", "b2", "b3", "b4"]);
    expect(result.unclustered).toHaveLength(0);
  });

  it("pools sub-dust communities as unclustered", () => {
    const edges = [...clique("a", 5), edge("x", "y", 1)];
    const result = detectCommunities(
      buildSceneGraph(edges),
      testConfig({ resolutions: [1] }),
    );
    expect(result.scenes).toHaveLength(1);
    expect([...result.unclustered].sort()).toEqual(["x", "y"]);
  });

  it("sub-clusters oversize communities at higher resolution", () => {
    // Two cliques bridged strongly enough that a very low γ merges them.
    const edges = [
      ...clique("a", 6, 3),
      ...clique("b", 6, 3),
      edge("a0", "b0", 3),
      edge("a1", "b1", 3),
      edge("a2", "b2", 3),
    ];
    const merged = detectCommunities(
      buildSceneGraph(edges),
      testConfig({ resolutions: [0.01], maxSceneSize: 100 }),
    );
    expect(merged.scenes).toHaveLength(1);

    const split = detectCommunities(
      buildSceneGraph(edges),
      testConfig({
        resolutions: [0.01],
        maxSceneSize: 8,
        subClusterResolutionFactor: 100,
      }),
    );
    expect(split.subClustered).toBe(1);
    expect(split.scenes.length).toBeGreaterThan(1);
  });

  it("sizes the sub-clustering limit by measured nodes only", () => {
    // Same oversize-by-raw-count graph as above, but only 4 nodes are
    // "measured" (crawled) — under the limit, so no split happens.
    const edges = [
      ...clique("a", 6, 3),
      ...clique("b", 6, 3),
      edge("a0", "b0", 3),
      edge("a1", "b1", 3),
      edge("a2", "b2", 3),
    ];
    const measured = new Set(["a0", "a1", "b0", "b1"]);
    const result = detectCommunities(
      buildSceneGraph(edges),
      testConfig({
        resolutions: [0.01],
        maxSceneSize: 8,
        subClusterResolutionFactor: 100,
      }),
      (node) => measured.has(node),
    );
    expect(result.subClustered).toBe(0);
    expect(result.scenes).toHaveLength(1);
  });

  it("is deterministic across runs", () => {
    const edges = [...clique("a", 6), ...clique("b", 6), edge("a0", "b0", 0.5)];
    const graph = buildSceneGraph(edges);
    const first = detectCommunities(graph, testConfig({}));
    const second = detectCommunities(graph, testConfig({}));
    expect(first).toEqual(second);
  });

  it("handles an empty graph", () => {
    const result = detectCommunities(buildSceneGraph([]), testConfig({}));
    expect(result.scenes).toEqual([]);
    expect(result.unclustered).toEqual([]);
  });
});
