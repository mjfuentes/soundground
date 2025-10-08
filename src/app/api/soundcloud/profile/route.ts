import { NextRequest, NextResponse } from "next/server";
import { resolveProfile, getSpotlight, getPlaylists, getAlbums, getTracks, getReposts } from "@/lib/soundcloud/smart-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const profile = await resolveProfile(url);

      const [spotlight, playlists, albums, tracks, reposts] = await Promise.all([
        getSpotlight(profile.id).catch(() => ({ collection: [] })),
        getPlaylists(profile.id).catch(() => ({ collection: [] })),
        getAlbums(profile.id).catch(() => ({ collection: [] })),
        getTracks(profile.id, 50).catch(() => ({ collection: [] })), // Limit to 50 tracks for performance
        getReposts(profile.id, 50).catch((error) => {
          console.error(`[Profile API] Failed to fetch reposts for user ${profile.id}:`, error.message);
          return { collection: [] };
        }), // Limit to 50 reposts
      ]);

      console.log(`[Profile API] Fetched reposts for ${profile.username}: ${reposts.collection.length} items`);

    return NextResponse.json({
      profile,
      spotlight: spotlight.collection,
      playlists: playlists.collection,
      albums: albums.collection,
      tracks: tracks.collection,
      reposts: reposts.collection,
      // Friends are now loaded separately via /api/soundcloud/friends
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return NextResponse.json(
      { error: "Failed to fetch SoundCloud profile data" },
      { status: 500 }
    );
  }
}

