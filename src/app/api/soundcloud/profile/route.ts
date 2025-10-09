import { NextRequest, NextResponse } from "next/server";
import { resolveProfile, getSpotlight, getPlaylists, getAlbums, getTracks, getReposts } from "@/lib/soundcloud/smart-client";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ route: "profile" });

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
          logger.error("Failed to fetch reposts", { userId: profile.id }, error);
          return { collection: [] };
        }), // Limit to 50 reposts
      ]);

      logger.info("Fetched reposts", { username: profile.username, count: reposts.collection.length });

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
    logger.error("Failed to fetch profile data", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch SoundCloud profile data" },
      { status: 500 }
    );
  }
}

