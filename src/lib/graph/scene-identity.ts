/**
 * Stable scene IDs across re-runs (ideas/0004 A1): each new cluster
 * inherits the ID of the previous scene it best overlaps with (greedy
 * max-Jaccard, one-to-one). Clusters overlapping nothing meaningful get
 * fresh IDs — so "Berlin Dub Techno" keeps its identity between crawls
 * even as membership drifts.
 */

export interface IdentityConfig {
  /** Overlap below this never inherits an ID (a rename, not a drift). */
  minJaccard: number;
}

export const DEFAULT_IDENTITY_CONFIG: IdentityConfig = { minJaccard: 0.1 };

interface Candidate {
  previousId: number;
  clusterIndex: number;
  jaccard: number;
}

/**
 * Assign an ID to each cluster. `previous` maps scene ID → member set from
 * the last run; result[i] is the ID for clusters[i].
 */
export function matchSceneIds(
  previous: ReadonlyMap<number, ReadonlySet<string>>,
  clusters: readonly (readonly string[])[],
  config: IdentityConfig = DEFAULT_IDENTITY_CONFIG,
): number[] {
  // One pass over cluster members to count intersections per previous scene.
  const previousByMember = new Map<string, number[]>();
  for (const [id, members] of previous) {
    for (const member of members) {
      const ids = previousByMember.get(member) ?? [];
      ids.push(id);
      previousByMember.set(member, ids);
    }
  }

  const candidates: Candidate[] = [];
  clusters.forEach((cluster, clusterIndex) => {
    const intersections = new Map<number, number>();
    for (const member of cluster) {
      for (const id of previousByMember.get(member) ?? []) {
        intersections.set(id, (intersections.get(id) ?? 0) + 1);
      }
    }
    for (const [previousId, intersection] of intersections) {
      const union = (previous.get(previousId)?.size ?? 0) + cluster.length - intersection;
      const jaccard = union > 0 ? intersection / union : 0;
      if (jaccard >= config.minJaccard) {
        candidates.push({ previousId, clusterIndex, jaccard });
      }
    }
  });

  // Greedy best-first matching; ties broken by lower previous ID then lower
  // cluster index for determinism.
  candidates.sort(
    (a, b) =>
      b.jaccard - a.jaccard ||
      a.previousId - b.previousId ||
      a.clusterIndex - b.clusterIndex,
  );

  const assigned = new Array<number | null>(clusters.length).fill(null);
  const usedIds = new Set<number>();
  for (const { previousId, clusterIndex } of candidates) {
    if (assigned[clusterIndex] !== null || usedIds.has(previousId)) continue;
    assigned[clusterIndex] = previousId;
    usedIds.add(previousId);
  }

  let nextId = Math.max(0, ...previous.keys()) + 1;
  return assigned.map((id) => {
    if (id !== null) return id;
    const fresh = nextId;
    nextId += 1;
    return fresh;
  });
}
