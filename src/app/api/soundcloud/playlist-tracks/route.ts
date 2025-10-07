import { NextRequest, NextResponse } from "next/server";
import { getPlaylistWithTracks } from "@/lib/soundcloud/cached-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const playlistId = searchParams.get("id");

  if (!playlistId) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
  }

  try {
    const playlist = await getPlaylistWithTracks(Number(playlistId));
    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlist tracks" },
      { status: 500 }
    );
  }
}

