import { NextRequest, NextResponse } from "next/server";
import { getSpotlight } from "@/lib/soundcloud/smart-client";
import { isTrackPlayable } from "@/lib/soundcloud/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing 'userId' parameter" }, { status: 400 });
  }

  try {
    const result = await getSpotlight(Number(userId));
    
    // Filter out unplayable tracks from all playlists
    if (result && Array.isArray(result)) {
      const filteredResult = result.map(playlist => {
        if (playlist.tracks && Array.isArray(playlist.tracks)) {
          return {
            ...playlist,
            tracks: playlist.tracks.filter(isTrackPlayable)
          };
        }
        return playlist;
      });
      return NextResponse.json(filteredResult);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching spotlight:", error);
    return NextResponse.json(
      { error: "Failed to fetch spotlight tracks" },
      { status: 500 }
    );
  }
}

