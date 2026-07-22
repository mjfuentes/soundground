/**
 * Render-time display resolution: the graph stores URNs + permalinks only
 * (ToS posture); usernames and avatars come live from the API, deduped per
 * render via React cache. Failures degrade to the stored permalink.
 */

import { cache } from "react";
import { getUser, seedUserCache } from "@/lib/soundcloud/official-cached-client";
import { urnToId } from "@/lib/soundcloud/official-client";
import type { RosterArtist } from "./types";

export interface ResolvedRosterArtist extends RosterArtist {
  displayName: string;
  avatarUrl: string | null;
  profileHref: string | null;
}

/** Polite fan-out: at most this many concurrent profile requests per roster. */
const RESOLVE_BATCH_SIZE = 4;

const resolveUser = cache(async (urn: string) => {
  try {
    const user = await getUser(urnToId(urn));
    // Pre-seed the profile page's resolve cache: clicking through to
    // /{permalink} would otherwise pay a slow /resolve round-trip for a
    // user object we are already holding.
    seedUserCache(user);
    return user;
  } catch (error) {
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
    displayName: user?.username || permalink || artist.urn,
    avatarUrl: user?.avatar_url ?? null,
    profileHref: permalink ? `/${permalink}` : null,
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

/**
 * Avatar URLs for card covers: dedupes urns across all cards on a page,
 * resolves in polite batches within a hard time budget, returns urn →
 * avatar (null when unknown or unresolved-in-time — the cache warms across
 * renders, so misses heal on subsequent visits).
 */
export async function resolveAvatarMap(
  urns: readonly string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(urns)];
  const avatars = new Map<string, string | null>(unique.map((urn) => [urn, null]));
  const deadline = Date.now() + AVATAR_RESOLVE_BUDGET_MS;
  for (let i = 0; i < unique.length; i += RESOLVE_BATCH_SIZE * 2) {
    if (Date.now() > deadline) break;
    const batch = unique.slice(i, i + RESOLVE_BATCH_SIZE * 2);
    const users = await Promise.all(batch.map((urn) => resolveUser(urn)));
    batch.forEach((urn, j) => avatars.set(urn, users[j]?.avatar_url ?? null));
  }
  return avatars;
}
