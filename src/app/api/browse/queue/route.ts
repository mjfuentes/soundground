/**
 * Scene queue builder (ideas/0003 Phase 4 — "listen to a scene").
 *
 * GET /api/browse/queue?genre=<slug> | ?city=<slug> | ?scene=<slug> | ?artist=<id>
 * Returns playable items from the scope's connection-ranked roster:
 * top artists' latest streamable tracks, round-robin interleaved so no
 * single artist dominates the mix. Track fetches go through the cached
 * official client.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSceneDetail } from "@/lib/browse/scene-store";
import { foldTerm } from "@/lib/browse/slug";
import { getCityDetail, getGenreDetail } from "@/lib/browse/store";
import { parseTagList } from "@/lib/crawler/extract";
import { getTracks } from "@/lib/soundcloud/official-cached-client";
import { urnToId } from "@/lib/soundcloud/official-client";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

const querySchema = z
  .object({
    genre: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    scene: z.string().min(1).max(100).optional(),
    artist: z.coerce.number().int().positive().optional(),
    /** Sound context for an artist queue: play only tracks in this sound. */
    within: z.string().min(1).max(100).optional(),
    /** Circle context: play only tracks carrying the circle's vocabulary. */
    withinCircle: z.string().min(1).max(100).optional(),
  })
  .refine(
    (query) => [query.genre, query.city, query.scene, query.artist].filter(Boolean).length === 1,
    "Pass exactly one of: genre, city, scene, artist",
  )
  .refine(
    (query) => [query.within, query.withinCircle].filter(Boolean).length <= 1,
    "Pass at most one context",
  )
  .refine(
    (query) => (!query.within && !query.withinCircle) || query.artist,
    "within/withinCircle require artist",
  );

const SCENE_ARTIST_COUNT = 8;
const TRACKS_PER_SCENE_ARTIST = 4;
const TRACKS_PER_SOLO_ARTIST = 30;
const MAX_QUEUE_LENGTH = 40;
const FETCH_BATCH_SIZE = 4;

interface QueueItem {
  id: number;
  url: string;
  title: string;
  artist: string;
  artistUrl: string;
  artwork?: string;
  type: "track";
}

function toQueueItem(track: SoundCloudTrack): QueueItem {
  return {
    id: track.id,
    url: track.permalink_url,
    title: track.title,
    artist: track.user?.username ?? "",
    artistUrl: track.user?.permalink_url ?? "",
    artwork: track.artwork_url,
    type: "track",
  };
}

/** How many of a circle's top tags define its playable vocabulary. */
const CIRCLE_MATCH_TAGS = 5;

/** Does the track carry any accepted fold, by genre field or tags? */
function matchesVocabulary(track: SoundCloudTrack, folds: ReadonlySet<string>): boolean {
  if (folds.has(foldTerm(track.genre ?? ""))) return true;
  return parseTagList(track.tag_list).some((tag) => folds.has(foldTerm(tag)));
}

/** The accepted term folds for an artist queue's context, if any. */
function contextFolds(query: {
  within?: string;
  withinCircle?: string;
}): Set<string> | null {
  if (query.within) return new Set([foldTerm(query.within)]);
  if (query.withinCircle) {
    const circle = getSceneDetail(query.withinCircle);
    if (!circle) return null;
    const folds = circle.tags.slice(0, CIRCLE_MATCH_TAGS).map(foldTerm).filter(Boolean);
    return folds.length > 0 ? new Set(folds) : null;
  }
  return null;
}

/** Round-robin across artists so a scene mix rotates voices. */
function interleave(perArtist: readonly QueueItem[][]): QueueItem[] {
  const longest = Math.max(0, ...perArtist.map((tracks) => tracks.length));
  const mixed: QueueItem[] = [];
  for (let round = 0; round < longest; round++) {
    for (const tracks of perArtist) {
      if (tracks[round]) mixed.push(tracks[round]);
    }
  }
  return mixed.slice(0, MAX_QUEUE_LENGTH);
}

async function tracksFor(userIds: readonly number[], perArtist: number): Promise<QueueItem[][]> {
  const results: QueueItem[][] = [];
  for (let i = 0; i < userIds.length; i += FETCH_BATCH_SIZE) {
    const batch = userIds.slice(i, i + FETCH_BATCH_SIZE);
    const collections = await Promise.all(
      batch.map(async (userId) => {
        try {
          const { collection } = await getTracks(userId, 50);
          return collection.filter(isTrackPlayable).slice(0, perArtist);
        } catch (error) {
          console.error(`[browse-queue] tracks fetch failed for user ${userId}:`, error);
          return [];
        }
      }),
    );
    results.push(...collections.map((tracks) => tracks.map(toQueueItem)));
  }
  return results;
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const query = parsed.data;

  try {
    let items: QueueItem[];

    if (query.artist) {
      const { collection } = await getTracks(query.artist, 50);
      const playable = collection.filter(isTrackPlayable);
      // In a sound/circle context, a label/curator catalog spans
      // everything — queue only tracks carrying that vocabulary.
      // Latest-anything is the fallback when nothing matches.
      const folds = contextFolds(query);
      const matched = folds
        ? playable.filter((track) => matchesVocabulary(track, folds))
        : playable;
      const pool = matched.length > 0 ? matched : playable;
      items = pool.slice(0, TRACKS_PER_SOLO_ARTIST).map(toQueueItem);
    } else {
      const detail = query.genre
        ? getGenreDetail(query.genre)
        : query.scene
          ? getSceneDetail(query.scene)
          : getCityDetail(query.city!);
      if (!detail) {
        return NextResponse.json({ error: "Unknown scene" }, { status: 404 });
      }
      const userIds = detail.roster
        .slice(0, SCENE_ARTIST_COUNT)
        .map((artist) => urnToId(artist.urn));
      items = interleave(await tracksFor(userIds, TRACKS_PER_SCENE_ARTIST));
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "No playable tracks in this scene yet" }, { status: 404 });
    }
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[browse-queue] failed:", error);
    return NextResponse.json({ error: "Failed to build queue" }, { status: 500 });
  }
}
