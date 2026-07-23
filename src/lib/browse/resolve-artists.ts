/**
 * Render-time display resolution: the graph stores URNs + permalinks only
 * (ToS posture); usernames and avatars come live from the API, deduped per
 * render via React cache. Failures degrade to the stored permalink.
 */

import { cache } from "react";
import {
  getUser,
  peekUser,
  peekUserAvatar,
  seedUserCache,
} from "@/lib/soundcloud/official-cached-client";
import { urnToId } from "@/lib/soundcloud/official-client";
import type { RosterArtist } from "./types";

export interface ResolvedRosterArtist extends RosterArtist {
  displayName: string;
  avatarUrl: string | null;
  profileHref: string | null;
}

/** Polite fan-out: at most this many concurrent profile requests per roster. */
const RESOLVE_BATCH_SIZE = 4;

// Failed resolutions (deleted/private accounts) are remembered in-process so
// they stop burning the per-render API budget — without this, the same dead
// accounts re-fetch on every render because errors never enter the cache.
const RESOLVE_FAILURE_TTL_MS = 6 * 60 * 60 * 1000;
const failedResolves = new Map<string, number>();

/** Test hook. */
export function __resetResolveFailuresForTests(): void {
  failedResolves.clear();
}

const resolveUser = cache(async (urn: string) => {
  const failedAt = failedResolves.get(urn);
  if (failedAt && Date.now() - failedAt < RESOLVE_FAILURE_TTL_MS) return null;
  try {
    const user = await getUser(urnToId(urn));
    // Pre-seed the profile page's resolve cache: clicking through to
    // /{permalink} would otherwise pay a slow /resolve round-trip for a
    // user object we are already holding.
    seedUserCache(user);
    failedResolves.delete(urn);
    return user;
  } catch (error) {
    failedResolves.set(urn, Date.now());
    console.error(
      `[browse] failed to resolve ${urn}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
});

function toResolved(
  artist: RosterArtist,
  user: Awaited<ReturnType<typeof resolveUser>>,
): ResolvedRosterArtist {
  const permalink = artist.permalink?.replace(/^\/+/, "") || null;
  return {
    ...artist,
    // Live profile beats the graph's sighting data: repost-discovered
    // artists carry no counts at all until crawled ("0 followers" lies).
    followers: user?.followers_count || artist.followers,
    displayName: user?.username || permalink || artist.urn,
    avatarUrl: user?.avatar_url ?? null,
    profileHref: user?.permalink ? `/${user.permalink}` : permalink ? `/${permalink}` : null,
  };
}

export async function resolveRoster(
  roster: readonly RosterArtist[],
): Promise<ResolvedRosterArtist[]> {
  const resolved: ResolvedRosterArtist[] = [];
  for (let i = 0; i < roster.length; i += RESOLVE_BATCH_SIZE) {
    const batch = roster.slice(i, i + RESOLVE_BATCH_SIZE);
    const users = await Promise.all(batch.map((artist) => resolveUser(artist.urn)));
    resolved.push(...batch.map((artist, j) => toResolved(artist, users[j])));
  }
  return resolved;
}

/** Covers must never stall a page render: after this budget, remaining tiles fall back to placeholders. */
const AVATAR_RESOLVE_BUDGET_MS = 4000;

/** Round-robin: first urn of every group, then second of every group, … */
function interleaveGroups(groups: readonly (readonly string[])[]): string[] {
  const longest = Math.max(0, ...groups.map((group) => group.length));
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (let round = 0; round < longest; round++) {
    for (const group of groups) {
      const urn = group[round];
      if (urn && !seen.has(urn)) {
        seen.add(urn);
        ordered.push(urn);
      }
    }
  }
  return ordered;
}

/**
 * Avatar URLs for card cover mosaics. Pass one urn group per card.
 * Two passes:
 * 1. Cache-only peek for every urn — free, instant, covers everything the
 *    crawler already warmed.
 * 2. The API budget goes to the gaps, round-robin across cards so no card
 *    starves into a fully-hatched wall. Misses heal on later renders as
 *    the cache warms.
 */
export async function resolveAvatarMap(
  groups: readonly (readonly string[])[],
): Promise<Map<string, string | null>> {
  const ordered = interleaveGroups(groups);
  const avatars = new Map<string, string | null>(ordered.map((urn) => [urn, null]));

  const misses: string[] = [];
  for (const urn of ordered) {
    const cached = peekUser(urnToId(urn));
    if (cached) {
      avatars.set(urn, cached.avatar_url ?? null);
    } else {
      misses.push(urn);
    }
  }

  const deadline = Date.now() + AVATAR_RESOLVE_BUDGET_MS;
  for (let i = 0; i < misses.length; i += RESOLVE_BATCH_SIZE * 2) {
    if (Date.now() > deadline) break;
    const batch = misses.slice(i, i + RESOLVE_BATCH_SIZE * 2);
    const users = await Promise.all(batch.map((urn) => resolveUser(urn)));
    batch.forEach((urn, j) => avatars.set(urn, users[j]?.avatar_url ?? null));
  }
  return avatars;
}

/**
 * Cache-only avatar map: field-level disk reads, never the API. For the
 * long tail of cards ("show more") where an API pass would be thousands
 * of requests — unresolved cells stay placeholders until the cache warms
 * through crawls or detail-page visits.
 */
export function peekAvatarMap(urns: readonly string[]): Map<string, string | null> {
  const avatars = new Map<string, string | null>();
  for (const urn of new Set(urns)) {
    avatars.set(urn, peekUserAvatar(urnToId(urn)));
  }
  return avatars;
}
