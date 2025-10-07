import { NextRequest, NextResponse } from "next/server";
import { resolveProfile, getSpotlight, getPlaylists, getAlbums, getFollowers, getFollowings, getTracks, SoundCloudFollower } from "@/lib/soundcloud/smart-client";

/**
 * Fetch all followers with pagination
 */
async function fetchAllFollowers(userId: number): Promise<SoundCloudFollower[]> {
  const allFollowers: SoundCloudFollower[] = [];
  let nextHref: string | undefined = undefined;
  
  try {
    // Fetch first page
    let response = await getFollowers(userId, 200);
    allFollowers.push(...response.collection);
    nextHref = response.next_href;
    
    // Fetch remaining pages
    while (nextHref) {
      response = await getFollowers(userId, 200, nextHref);
      allFollowers.push(...response.collection);
      nextHref = response.next_href;
    }
  } catch (error) {
    console.error("Error fetching all followers:", error);
  }
  
  return allFollowers;
}

/**
 * Fetch all followings with pagination
 */
async function fetchAllFollowings(userId: number): Promise<SoundCloudFollower[]> {
  const allFollowings: SoundCloudFollower[] = [];
  let nextHref: string | undefined = undefined;
  
  try {
    // Fetch first page
    let response = await getFollowings(userId, 200);
    allFollowings.push(...response.collection);
    nextHref = response.next_href;
    
    // Fetch remaining pages
    while (nextHref) {
      response = await getFollowings(userId, 200, nextHref);
      allFollowings.push(...response.collection);
      nextHref = response.next_href;
    }
  } catch (error) {
    console.error("Error fetching all followings:", error);
  }
  
  return allFollowings;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const profile = await resolveProfile(url);

    const [spotlight, playlists, albums, allFollowers, allFollowings, tracks] = await Promise.all([
      getSpotlight(profile.id).catch(() => ({ collection: [] })),
      getPlaylists(profile.id).catch(() => ({ collection: [] })),
      getAlbums(profile.id).catch(() => ({ collection: [] })),
      fetchAllFollowers(profile.id),
      fetchAllFollowings(profile.id),
      getTracks(profile.id, 50).catch(() => ({ collection: [] })), // Limit to 50 tracks for performance
    ]);

    console.log(`Fetched ${allFollowers.length} followers and ${allFollowings.length} followings for ${profile.username}`);

    // Create a Set of following IDs for fast lookup
    const followingIds = new Set(allFollowings.map(f => f.id));
    
    // Filter followers to only include friends (mutual follows)
    const friends = allFollowers.filter(follower => followingIds.has(follower.id));
    
    // Sort friends by follower count (descending)
    const sortedFriends = friends.sort((a, b) => b.followers_count - a.followers_count);

    console.log(`Found ${friends.length} friends (mutual follows) for ${profile.username}`);

    return NextResponse.json({
      profile,
      spotlight: spotlight.collection,
      playlists: playlists.collection,
      albums: albums.collection,
      tracks: tracks.collection,
      topFollowers: sortedFriends, // Now contains only mutual follows (friends)
      followersNextHref: undefined, // We've fetched all, so no next page
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Failed to fetch SoundCloud profile data" },
      { status: 500 }
    );
  }
}

