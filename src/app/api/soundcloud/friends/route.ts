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
  const followerCount = parseInt(searchParams.get("followerCount") || "0", 10);

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing 'userId' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIdNum = parseInt(userId, 10);
  const startTime = Date.now();
  
  // For big artists (>10k followers), just show their followings as "friends"
  const BIG_ARTIST_THRESHOLD = 10000;
  const isBigArtist = followerCount > BIG_ARTIST_THRESHOLD;

  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get all following IDs (from cache if available)
        console.log(`Fetching followings for user ${userIdNum} (${followerCount} followers)...`);
        const { ids: followingIds, total: totalFollowings } = await getAllFollowingIds(userIdNum);
        
        if (isBigArtist) {
          console.log(`Big artist detected (${followerCount} followers) - streaming followings as friends (limit: ${limit})...`);
          
          // For big artists, just stream their followings
          let followingsStreamed = 0;
          let followingsNextHref: string | undefined = undefined;
          let followingsResponse = await getFollowings(userIdNum, Math.min(limit, 200));
          
          // Send each following as a "friend"
          for (const following of followingsResponse.collection) {
            if (followingsStreamed >= limit) break;
            const data = JSON.stringify({ type: 'friend', data: following }) + '\n';
            controller.enqueue(encoder.encode(data));
            followingsStreamed++;
          }
          
          followingsNextHref = followingsResponse.next_href;
          
          // Continue fetching if needed
          while (followingsNextHref && followingsStreamed < limit) {
            followingsResponse = await getFollowings(userIdNum, Math.min(limit - followingsStreamed, 200), followingsNextHref);
            
            for (const following of followingsResponse.collection) {
              if (followingsStreamed >= limit) break;
              const data = JSON.stringify({ type: 'friend', data: following }) + '\n';
              controller.enqueue(encoder.encode(data));
              followingsStreamed++;
            }
            
            followingsNextHref = followingsResponse.next_href;
          }
          
          const hasMore = followingsNextHref !== undefined;
          console.log(`Streamed ${followingsStreamed} followings as friends (hasMore: ${hasMore})`);
          
          // Send completion message
          const completionData = JSON.stringify({
            type: 'complete',
            data: {
              totalFollowings,
              friendsStreamed: followingsStreamed,
              hasMore,
              fetchTimeMs: Date.now() - startTime,
            }
          }) + '\n';
          controller.enqueue(encoder.encode(completionData));
          controller.close();
          return;
        }
        
        console.log(`Fetched ${totalFollowings} followings (cached), now streaming mutual friends (limit: ${limit})...`);

        // Now stream followers and check for friends as we go
        let followersNextHref: string | undefined = undefined;
        let totalFollowers = 0;
        let friendsFound = 0;

        // Fetch followers page by page until we have enough friends
        console.log(`[Friends API] Fetching first batch of followers for user ${userIdNum}...`);
        let followersResponse = await getFollowers(userIdNum, 200);
        console.log(`[Friends API] Got ${followersResponse.collection.length} followers in first batch`);
        totalFollowers += followersResponse.collection.length;

        // Check for friends in this batch
        const friendsInBatch = followersResponse.collection.filter(follower => 
          followingIds.has(follower.id)
        );
        console.log(`[Friends API] Found ${friendsInBatch.length} friends in first batch`);

        // Send each friend immediately
        for (const friend of friendsInBatch) {
          if (friendsFound >= limit) break;
          const data = JSON.stringify({ type: 'friend', data: friend }) + '\n';
          controller.enqueue(encoder.encode(data));
          friendsFound++;
          console.log(`[Friends API] Streamed friend ${friendsFound}: ${friend.username}`);
        }

        followersNextHref = followersResponse.next_href;
        console.log(`[Friends API] First batch done, friendsFound: ${friendsFound}, hasMore: ${!!followersNextHref}`);

        // Continue with remaining pages until we hit the limit
        // BUT: limit total follower scan to prevent infinite loops on huge accounts
        const MAX_FOLLOWERS_TO_SCAN = 2000; // Stop after scanning 2000 followers
        let batchNum = 1;
        while (followersNextHref && friendsFound < limit && totalFollowers < MAX_FOLLOWERS_TO_SCAN) {
          batchNum++;
          console.log(`[Friends API] Fetching batch ${batchNum}... (scanned ${totalFollowers} followers so far)`);
          followersResponse = await getFollowers(userIdNum, 200, followersNextHref);
          console.log(`[Friends API] Got ${followersResponse.collection.length} followers in batch ${batchNum}`);
          totalFollowers += followersResponse.collection.length;

          // Check for friends in this batch
          const friendsInBatch = followersResponse.collection.filter(follower => 
            followingIds.has(follower.id)
          );
          console.log(`[Friends API] Found ${friendsInBatch.length} friends in batch ${batchNum}`);

          // Send each friend immediately (up to limit)
          for (const friend of friendsInBatch) {
            if (friendsFound >= limit) break;
            const data = JSON.stringify({ type: 'friend', data: friend }) + '\n';
            controller.enqueue(encoder.encode(data));
            friendsFound++;
            console.log(`[Friends API] Streamed friend ${friendsFound}: ${friend.username}`);
          }

          followersNextHref = followersResponse.next_href;
          console.log(`[Friends API] Batch ${batchNum} done, friendsFound: ${friendsFound}, totalScanned: ${totalFollowers}, hasMore: ${!!followersNextHref}`);
        }
        
        if (totalFollowers >= MAX_FOLLOWERS_TO_SCAN && friendsFound < limit) {
          console.log(`[Friends API] Stopped scanning - hit max limit of ${MAX_FOLLOWERS_TO_SCAN} followers`);
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

