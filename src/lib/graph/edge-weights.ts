/**
 * Edge weighting for scene detection (ideas/0004 B1 + A1 input).
 *
 * Directed strength: s(u→v) = 1[follow] + h(u) · log2(1 + reposts(u→v)),
 * where h(u) discounts promo/repost hubs — accounts reposting far more
 * distinct artists than any organic curator (hypeddit reposted 179 in the
 * Berlin crawl, median source: 22). Each source's repost signal is capped
 * as if it reposted at most `repostHubCap` distinct artists; follows are
 * never discounted (following 2k people is normal, reposting 2k is promo).
 *
 * Symmetrized weight: w(u,v) = s(u→v) + s(v→u) + min(s(u→v), s(v→u)) —
 * the bonus rewards reciprocal ties, the strongest scene signal we have.
 */

import type { Database } from "better-sqlite3";

export interface DirectedPair {
  src: string;
  dst: string;
  follow: boolean;
  /** Distinct tracks by dst that src reposted. */
  reposts: number;
}

export interface EdgeWeightConfig {
  /** Distinct repost targets beyond which a source's repost signal is capped. */
  repostHubCap: number;
}

export const DEFAULT_EDGE_WEIGHT_CONFIG: EdgeWeightConfig = {
  repostHubCap: 40, // ≈p80 of the Berlin crawl; organic curation stays whole
};

/** Directed strengths as src → (dst → strength). */
export type DirectedStrengths = Map<string, Map<string, number>>;

export interface SymmetricEdge {
  u: string;
  v: string;
  weight: number;
}

/** Fold the edges table (one row per type) into one pair per direction. */
export function loadDirectedPairs(db: Database): DirectedPair[] {
  const rows = db
    .prepare(
      `SELECT src_urn, dst_urn,
              MAX(CASE WHEN type = 'follow' THEN 1 ELSE 0 END) AS follow,
              SUM(CASE WHEN type = 'repost' THEN weight ELSE 0 END) AS reposts
       FROM edges GROUP BY src_urn, dst_urn`,
    )
    .all() as { src_urn: string; dst_urn: string; follow: number; reposts: number }[];
  return rows.map((row) => ({
    src: row.src_urn,
    dst: row.dst_urn,
    follow: row.follow === 1,
    reposts: row.reposts,
  }));
}

/**
 * Per-source repost discount: 1 for sources at/under the cap, cap/degree
 * beyond it — a hub reposting 4× the cap contributes 1/4 per edge, so its
 * total repost contribution never exceeds a cap-sized curator's.
 */
export function repostHubFactors(
  pairs: readonly DirectedPair[],
  config: EdgeWeightConfig = DEFAULT_EDGE_WEIGHT_CONFIG,
): Map<string, number> {
  const targets = new Map<string, Set<string>>();
  for (const { src, dst, reposts } of pairs) {
    if (reposts <= 0) continue;
    const set = targets.get(src) ?? new Set<string>();
    set.add(dst);
    targets.set(src, set);
  }
  return new Map(
    [...targets.entries()].map(([src, set]) => [
      src,
      Math.min(1, config.repostHubCap / set.size),
    ]),
  );
}

/** s(u→v) per pair; sources absent from `factors` are undiscounted. */
export function directedStrengths(
  pairs: readonly DirectedPair[],
  factors: ReadonlyMap<string, number>,
): DirectedStrengths {
  const strengths: DirectedStrengths = new Map();
  for (const { src, dst, follow, reposts } of pairs) {
    if (src === dst) continue; // self-follow/self-repost artifacts carry no tie
    const factor = factors.get(src) ?? 1;
    const strength = (follow ? 1 : 0) + factor * Math.log2(1 + reposts);
    if (strength <= 0) continue;
    const bySrc = strengths.get(src) ?? new Map<string, number>();
    bySrc.set(dst, strength);
    strengths.set(src, bySrc);
  }
  return strengths;
}

/** Undirected edges with reciprocity bonus, each pair emitted once (u < v). */
export function symmetrize(strengths: DirectedStrengths): SymmetricEdge[] {
  const edges: SymmetricEdge[] = [];
  for (const [src, byDst] of strengths) {
    for (const [dst, forward] of byDst) {
      const backward = strengths.get(dst)?.get(src) ?? 0;
      // Emit from the lexicographically smaller endpoint; a reciprocal pair
      // is visited twice, so the larger endpoint's visit must skip it.
      if (src > dst && backward > 0) continue;
      const [u, v] = src < dst ? [src, dst] : [dst, src];
      edges.push({ u, v, weight: forward + backward + Math.min(forward, backward) });
    }
  }
  return edges;
}
