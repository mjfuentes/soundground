/**
 * Community detection (ideas/0004 A1): Louvain over the symmetrized,
 * hub-discounted scene graph.
 *
 * Louvain (graphology-communities-louvain) is the mature choice today; the
 * detection seam is this module's public surface — swapping to leiden-ts
 * later means reimplementing `runDetection` only, callers never see it.
 *
 * Resolution sweep: run at several γ, keep the partition whose community
 * sizes look like scenes (largest < ~10% of nodes, median non-dust
 * community 50–2,000). Oversize communities are sub-clustered once at a
 * higher γ; communities below the dust threshold are pooled as unclustered.
 */

import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { SymmetricEdge } from "./edge-weights";

export interface CommunityConfig {
  /** Resolutions to sweep; higher γ yields smaller communities. */
  resolutions: number[];
  /** Reject partitions whose largest community exceeds this node fraction. */
  maxLargestFraction: number;
  /** Preferred median size of non-dust communities. */
  medianRange: [number, number];
  /** Communities above this size get one sub-clustering pass at higher γ. */
  maxSceneSize: number;
  /** γ multiplier for the sub-clustering pass. */
  subClusterResolutionFactor: number;
  /** Communities below this size are pooled as unclustered. */
  dustThreshold: number;
  /** Louvain is stochastic; a fixed seed keeps runs reproducible. */
  rngSeed: number;
}

export const DEFAULT_COMMUNITY_CONFIG: CommunityConfig = {
  resolutions: [0.5, 1, 2, 4, 8],
  maxLargestFraction: 0.1,
  medianRange: [50, 2000],
  maxSceneSize: 3000,
  subClusterResolutionFactor: 2,
  dustThreshold: 20,
  rngSeed: 20260722,
};

export interface PartitionStats {
  resolution: number;
  communityCount: number;
  largestFraction: number;
  /** Median size of communities at/above the dust threshold (0 when none). */
  medianSceneSize: number;
}

export interface DetectedPartition {
  /** Clusters at/above the dust threshold, largest first. */
  scenes: string[][];
  /** Members of sub-dust communities, pooled. */
  unclustered: string[];
  resolution: number;
  sweep: PartitionStats[];
  /** Oversize communities that were split by the sub-clustering pass. */
  subClustered: number;
}

/** Deterministic PRNG (mulberry32) so Louvain runs are reproducible. */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSceneGraph(edges: readonly SymmetricEdge[]): Graph {
  const graph = new Graph({ type: "undirected", allowSelfLoops: false });
  for (const { u, v, weight } of edges) {
    if (u === v) continue;
    graph.mergeNode(u);
    graph.mergeNode(v);
    graph.mergeEdge(u, v, { weight });
  }
  return graph;
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function partitionStats(
  sizes: readonly number[],
  totalNodes: number,
  resolution: number,
  dustThreshold: number,
): PartitionStats {
  const sceneSizes = sizes.filter((size) => size >= dustThreshold).sort((a, b) => a - b);
  return {
    resolution,
    communityCount: sizes.length,
    largestFraction: totalNodes > 0 ? Math.max(0, ...sizes) / totalNodes : 0,
    medianSceneSize: median(sceneSizes),
  };
}

/**
 * Pick the sweep winner: partitions whose largest community stays under the
 * cap beat those that don't; then the median non-dust size closest to (and
 * ideally inside) the target range; then the lower γ (coarser partitions
 * are more stable run-to-run).
 */
export function pickPartition(sweep: readonly PartitionStats[], config: CommunityConfig): number {
  if (sweep.length === 0) throw new Error("pickPartition: empty sweep");
  const [lo, hi] = config.medianRange;
  const medianPenalty = (stats: PartitionStats) => {
    if (stats.medianSceneSize === 0) return Number.POSITIVE_INFINITY;
    if (stats.medianSceneSize < lo) return (lo - stats.medianSceneSize) / lo;
    if (stats.medianSceneSize > hi) return (stats.medianSceneSize - hi) / hi;
    return 0;
  };
  // Qualifying partitions: coarser (lower γ) wins — more stable run-to-run.
  // Violating partitions: least-oversized largest community wins.
  const rank = (stats: PartitionStats): [number, number, number, number] => {
    const violates = stats.largestFraction > config.maxLargestFraction;
    return [
      violates ? 1 : 0,
      medianPenalty(stats),
      violates ? stats.largestFraction : stats.resolution,
      violates ? stats.resolution : stats.largestFraction,
    ];
  };
  let best = 0;
  for (let i = 1; i < sweep.length; i++) {
    const a = rank(sweep[i]);
    const b = rank(sweep[best]);
    for (let k = 0; k < a.length; k++) {
      if (a[k] < b[k]) {
        best = i;
        break;
      }
      if (a[k] > b[k]) break;
    }
  }
  return best;
}

function clustersOf(assignment: Record<string, number>): string[][] {
  const byCommunity = new Map<number, string[]>();
  for (const [node, community] of Object.entries(assignment)) {
    const members = byCommunity.get(community) ?? [];
    members.push(node);
    byCommunity.set(community, members);
  }
  return [...byCommunity.values()];
}

/** The Louvain call itself — the leiden-ts migration seam. */
function runDetection(graph: Graph, resolution: number, rngSeed: number): string[][] {
  const assignment = louvain(graph, {
    resolution,
    rng: seededRng(rngSeed),
    getEdgeWeight: "weight",
  });
  return clustersOf(assignment);
}

function inducedSubgraph(graph: Graph, members: readonly string[]): Graph {
  const memberSet = new Set(members);
  const subgraph = new Graph({ type: "undirected", allowSelfLoops: false });
  for (const node of members) subgraph.mergeNode(node);
  graph.forEachEdge((_edge, attributes, source, target) => {
    if (memberSet.has(source) && memberSet.has(target)) {
      subgraph.mergeEdge(source, target, { weight: attributes.weight as number });
    }
  });
  return subgraph;
}

export function detectCommunities(
  graph: Graph,
  config: CommunityConfig = DEFAULT_COMMUNITY_CONFIG,
): DetectedPartition {
  if (graph.order === 0) {
    return { scenes: [], unclustered: [], resolution: 0, sweep: [], subClustered: 0 };
  }

  const runs = config.resolutions.map((resolution) => ({
    resolution,
    clusters: runDetection(graph, resolution, config.rngSeed),
  }));
  const sweep = runs.map((run) =>
    partitionStats(
      run.clusters.map((cluster) => cluster.length),
      graph.order,
      run.resolution,
      config.dustThreshold,
    ),
  );
  const chosen = runs[pickPartition(sweep, config)];

  // One sub-clustering pass: oversize communities re-run at higher γ.
  let subClustered = 0;
  const clusters = chosen.clusters.flatMap((cluster) => {
    if (cluster.length <= config.maxSceneSize) return [cluster];
    const parts = runDetection(
      inducedSubgraph(graph, cluster),
      chosen.resolution * config.subClusterResolutionFactor,
      config.rngSeed,
    );
    if (parts.length <= 1) return [cluster];
    subClustered += 1;
    return parts;
  });

  const scenes = clusters
    .filter((cluster) => cluster.length >= config.dustThreshold)
    .sort((a, b) => b.length - a.length);
  const unclustered = clusters
    .filter((cluster) => cluster.length < config.dustThreshold)
    .flat();

  return { scenes, unclustered, resolution: chosen.resolution, sweep, subClustered };
}
