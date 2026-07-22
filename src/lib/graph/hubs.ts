/**
 * Hub classification (ideas/0004 B4, v1): separate institutional accounts —
 * labels, radios, magazines, promo channels — from artists, so scene
 * rosters show musicians and hubs get their own strip.
 *
 * Two signals, calibrated against the Berlin crawl:
 * - Mechanical: track_count ≥ HUB_TRACK_THRESHOLD. Radios/blogs upload
 *   thousands of episodes (rinsefm 35k, xlr8r 5.4k); no individual artist
 *   has a four-digit own-catalog.
 * - Canon: data/canon/accounts.json for the judgment cases mechanics can't
 *   see (labels with small catalogs — monkeytownrecords has 77 tracks).
 *
 * Repost-out-degree deliberately does NOT classify: prolific reposting is
 * normal artist behavior here (verified: real artists reach 150+ distinct
 * repost targets), and promo spraying is already discounted at the edge-
 * weight layer.
 */

import type { AccountCanon } from "@/lib/browse/canon";

export const HUB_TRACK_THRESHOLD = 1000;

export interface HubCandidate {
  urn: string;
  permalink: string | null;
  trackCount: number | null;
}

export function isHub(candidate: HubCandidate, canon: AccountCanon): boolean {
  if ((candidate.trackCount ?? 0) >= HUB_TRACK_THRESHOLD) return true;
  const permalink = candidate.permalink?.toLowerCase();
  return permalink !== undefined && canon.hubPermalinks.has(permalink);
}

export function classifyHubs(
  candidates: Iterable<HubCandidate>,
  canon: AccountCanon,
): Set<string> {
  const hubs = new Set<string>();
  for (const candidate of candidates) {
    if (isHub(candidate, canon)) hubs.add(candidate.urn);
  }
  return hubs;
}
