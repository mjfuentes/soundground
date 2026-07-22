/**
 * Scene queue builder (ideas/0003 Phase 4 — "listen to a scene").
 *
 * GET /api/browse/queue?genre=<slug> | ?city=<slug> | ?artist=<id>
 * Returns playable items from the scope's connection-ranked roster:
 * top artists' latest streamable tracks, round-robin interleaved so no
 * single artist dominates the mix. Track fetches go through the cached
 * official client.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCityDetail, getGenreDetail } from "@/lib/browse/store";
import { getTracks } from "@/lib/soundcloud/official-cached-client";
import { urnToId } from "@/lib/soundcloud/official-client";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";

const querySchema = z
  .object({
    genre: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    artist: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (query) => [query.genre, query.city, query.artist].filter(Boolean).length === 1,
    "Pass exactly one of: genre, city, artist",
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
    let userIds: number[];
    let perArtist: number;

    if (query.artist) {
      userIds = [query.artist];
      perArtist = TRACKS_PER_SOLO_ARTIST;
    } else {
      const detail = query.genre ? getGenreDetail(query.genre) : getCityDetail(query.city!);
      if (!detail) {
        return NextResponse.json({ error: "Unknown scene" }, { status: 404 });
      }
      userIds = detail.roster.slice(0, SCENE_ARTIST_COUNT).map((artist) => urnToId(artist.urn));
      perArtist = TRACKS_PER_SCENE_ARTIST;
    }

    const items = interleave(await tracksFor(userIds, perArtist));
    if (items.length === 0) {
      return NextResponse.json({ error: "No playable tracks in this scene yet" }, { status: 404 });
    }
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[browse-queue] failed:", error);
    return NextResponse.json({ error: "Failed to build queue" }, { status: 500 });
  }
}
