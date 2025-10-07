import { NextRequest, NextResponse } from "next/server";
import { resolveProfile, getSpotlight, getPlaylists, getAlbums, getFollowers, getFollowings, getTracks } from "@/lib/soundcloud/smart-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const profile = await resolveProfile(url);

    const [spotlight, playlists, albums, followers, followings, tracks] = await Promise.all([
      getSpotlight(profile.id).catch(() => ({ collection: [] })),
      getPlaylists(profile.id).catch(() => ({ collection: [] })),
      getAlbums(profile.id).catch(() => ({ collection: [] })),
      getFollowers(profile.id, 200).catch(() => ({ collection: [], next_href: undefined })),
      getFollowings(profile.id, 200).catch(() => ({ collection: [], next_href: undefined })),
      getTracks(profile.id, 50).catch(() => ({ collection: [] })), // Limit to 50 tracks for performance
    ]);

    // Create a Set of following IDs for fast lookup
    const followingIds = new Set(followings.collection.map(f => f.id));
    
    // Filter followers to only include friends (mutual follows)
    const friends = followers.collection.filter(follower => followingIds.has(follower.id));
    
    // Sort friends by follower count (descending)
    const sortedFriends = friends.sort((a, b) => b.followers_count - a.followers_count);

    return NextResponse.json({
      profile,
      spotlight: spotlight.collection,
      playlists: playlists.collection,
      albums: albums.collection,
      tracks: tracks.collection,
      topFollowers: sortedFriends, // Now contains only mutual follows (friends)
      followersNextHref: followers.next_href,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Failed to fetch SoundCloud profile data" },
      { status: 500 }
    );
  }
}

