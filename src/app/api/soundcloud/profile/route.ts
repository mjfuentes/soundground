import { NextRequest, NextResponse } from "next/server";
import { resolveProfile, getSpotlight, getPlaylists, getAlbums, getFollowers } from "@/lib/soundcloud/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const profile = await resolveProfile(url);

    const [spotlight, playlists, albums, followers] = await Promise.all([
      getSpotlight(profile.id).catch(() => ({ collection: [] })),
      getPlaylists(profile.id).catch(() => ({ collection: [] })),
      getAlbums(profile.id).catch(() => ({ collection: [] })),
      getFollowers(profile.id, 200).catch(() => ({ collection: [], next_href: undefined })),
    ]);

    // Sort all followers by follower count (descending) and take top results
    const sortedFollowers = followers.collection.sort((a, b) => b.followers_count - a.followers_count);

    return NextResponse.json({
      profile,
      spotlight: spotlight.collection,
      playlists: playlists.collection,
      albums: albums.collection,
      topFollowers: sortedFollowers,
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

