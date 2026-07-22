/**
 * Pure extraction: API responses → graph records. No I/O here so every
 * rule is unit-testable.
 */

import type { SoundCloudFollower, SoundCloudTrack } from "@/lib/soundcloud/client";
import { userUrn } from "@/lib/soundcloud/official-client";
import type { EdgeRecord, TermRecord } from "@/lib/graph/repository";

/**
 * Parse SoundCloud's tag_list format: space-separated, multi-word tags
 * wrapped in double quotes — e.g. `techno "deep house" dub`.
 */
export function parseTagList(tagList: string | undefined): string[] {
  if (!tagList) return [];
  const matches = tagList.match(/"[^"]+"|\S+/g) ?? [];
  return matches
    .map((tag) => tag.replace(/^"|"$/g, "").trim().toLowerCase())
    .filter((tag) => tag.length > 1);
}

export function followEdges(
  srcUrn: string,
  followings: readonly SoundCloudFollower[],
): EdgeRecord[] {
  return followings
    .filter((user) => user.id && userUrn(user.id) !== srcUrn)
    .map((user) => ({
      srcUrn,
      dstUrn: userUrn(user.id),
      type: "follow" as const,
      weight: 1,
      source: "soundcloud:followings",
    }));
}

/** Reposts grouped by track owner: reposting 3 tracks by X = weight 3 edge. */
export function repostEdges(
  srcUrn: string,
  reposts: readonly SoundCloudTrack[],
): EdgeRecord[] {
  const counts = reposts.reduce<Map<number, number>>((acc, track) => {
    const ownerId = track.user?.id;
    if (!ownerId || userUrn(ownerId) === srcUrn) return acc;
    return new Map(acc).set(ownerId, (acc.get(ownerId) ?? 0) + 1);
  }, new Map());

  return [...counts.entries()].map(([ownerId, count]) => ({
    srcUrn,
    dstUrn: userUrn(ownerId),
    type: "repost" as const,
    weight: count,
    source: "soundcloud:reposts",
  }));
}

export interface TrackObservations {
  terms: TermRecord[];
  purchaseUrls: string[];
  lastUploadAt: string | null;
  engagement: { plays: number; likes: number; comments: number };
}

/** Genre + tag evidence, purchase links, and recency from an artist's tracks. */
export function observeTracks(
  artistUrn: string,
  tracks: readonly SoundCloudTrack[],
): TrackObservations {
  const termCounts = new Map<string, TermRecord>();
  const addTerm = (term: string, kind: "genre" | "tag") => {
    const key = `${kind}:${term}`;
    const existing = termCounts.get(key);
    termCounts.set(
      key,
      existing
        ? { ...existing, evidence: existing.evidence + 1 }
        : { artistUrn, term, kind, evidence: 1 },
    );
  };

  for (const track of tracks) {
    const genre = track.genre?.trim().toLowerCase();
    if (genre && genre.length > 1) addTerm(genre, "genre");
    for (const tag of parseTagList(track.tag_list)) addTerm(tag, "tag");
  }

  const purchaseUrls = [
    ...new Set(
      tracks
        .map((track) => track.purchase_url)
        .filter((url): url is string => !!url && url.startsWith("http")),
    ),
  ];

  const lastUploadAt = tracks.reduce<string | null>((latest, track) => {
    if (!track.created_at) return latest;
    const parsed = new Date(track.created_at);
    if (Number.isNaN(parsed.getTime())) return latest;
    const iso = parsed.toISOString();
    return !latest || iso > latest ? iso : latest;
  }, null);

  const engagement = tracks.reduce(
    (totals, track) => ({
      plays: totals.plays + (track.playback_count ?? 0),
      likes: totals.likes + (track.likes_count ?? 0),
      comments: totals.comments + (track.comment_count ?? 0),
    }),
    { plays: 0, likes: 0, comments: 0 },
  );

  return { terms: [...termCounts.values()], purchaseUrls, lastUploadAt, engagement };
}
