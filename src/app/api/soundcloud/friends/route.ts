import { NextRequest } from "next/server";
import { getFollowers, getFollowings, SoundCloudFollower } from "@/lib/soundcloud/smart-client";
import { getCacheService } from "@/lib/cache";

const FRIENDS_PER_BATCH = 48;
const FOLLOWINGS_CACHE_TTL = 600; // 10 minutes - followings don't change often

async function getAllFollowingIds(userIdNum: number): Promise<{ ids: Set<number>; total: number }> {
  const cache = getCacheService();
  const cacheKey = `user:${userIdNum}:all-following-ids`;
  
  // Try to get from cache first
  const cached = cache.get<{ ids: number[]; total: number }>(cacheKey);
  if (cached) {
    return { ids: new Set(cached.ids), total: cached.total };
  }
  
  // Not in cache, fetch all followings
  const followingIds = new Set<number>();
  let followingsNextHref: string | undefined = undefined;
  let totalFollowings = 0;

  // Fetch all followings (needed for comparison)
  let followingsResponse = await getFollowings(userIdNum, 200);
  followingsResponse.collection.forEach(f => followingIds.add(f.id));
  totalFollowings += followingsResponse.collection.length;
  followingsNextHref = followingsResponse.next_href;

  while (followingsNextHref) {
    followingsResponse = await getFollowings(userIdNum, 200, followingsNextHref);
    followingsResponse.collection.forEach(f => followingIds.add(f.id));
    totalFollowings += followingsResponse.collection.length;
    followingsNextHref = followingsResponse.next_href;
  }
  
  // Cache the complete set
  cache.set(
    cacheKey,
    { ids: Array.from(followingIds), total: totalFollowings },
    { ttl: FOLLOWINGS_CACHE_TTL * 1000, type: "followings_set" } // Convert seconds to ms
  );
  
  return { ids: followingIds, total: totalFollowings };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || String(FRIENDS_PER_BATCH), 10);

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing 'userId' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIdNum = parseInt(userId, 10);
  const startTime = Date.now();

  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get all following IDs (from cache if available)
        console.log(`Fetching followings for user ${userIdNum}...`);
        const { ids: followingIds, total: totalFollowings } = await getAllFollowingIds(userIdNum);
        
        console.log(`Fetched ${totalFollowings} followings (cached), now streaming friends (limit: ${limit})...`);

        // Now stream followers and check for friends as we go
        let followersNextHref: string | undefined = undefined;
        let totalFollowers = 0;
        let friendsFound = 0;

        // Fetch followers page by page until we have enough friends
        let followersResponse = await getFollowers(userIdNum, 200);
        totalFollowers += followersResponse.collection.length;

        // Check for friends in this batch
        const friendsInBatch = followersResponse.collection.filter(follower => 
          followingIds.has(follower.id)
        );

        // Send each friend immediately
        for (const friend of friendsInBatch) {
          if (friendsFound >= limit) break;
          const data = JSON.stringify({ type: 'friend', data: friend }) + '\n';
          controller.enqueue(encoder.encode(data));
          friendsFound++;
        }

        followersNextHref = followersResponse.next_href;

        // Continue with remaining pages until we hit the limit
        while (followersNextHref && friendsFound < limit) {
          followersResponse = await getFollowers(userIdNum, 200, followersNextHref);
          totalFollowers += followersResponse.collection.length;

          // Check for friends in this batch
          const friendsInBatch = followersResponse.collection.filter(follower => 
            followingIds.has(follower.id)
          );

          // Send each friend immediately (up to limit)
          for (const friend of friendsInBatch) {
            if (friendsFound >= limit) break;
            const data = JSON.stringify({ type: 'friend', data: friend }) + '\n';
            controller.enqueue(encoder.encode(data));
            friendsFound++;
          }

          followersNextHref = followersResponse.next_href;
        }

        const hasMore = followersNextHref !== undefined;

        console.log(`Streamed ${friendsFound} friends (hasMore: ${hasMore})`);

        // Send completion message with stats
        const completionData = JSON.stringify({
          type: 'complete',
          data: {
            totalFollowings,
            friendsStreamed: friendsFound,
            hasMore,
            fetchTimeMs: Date.now() - startTime,
          }
        }) + '\n';
        controller.enqueue(encoder.encode(completionData));

        controller.close();
      } catch (error) {
        console.error("Error streaming friends:", error);
        const errorData = JSON.stringify({
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' }
        }) + '\n';
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

