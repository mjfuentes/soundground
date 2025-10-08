import { NextRequest, NextResponse } from "next/server";
import { getTracks } from "@/lib/soundcloud/smart-client";
import { isTrackPlayable } from "@/lib/soundcloud/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = searchParams.get("limit");

  if (!userId) {
    return NextResponse.json({ error: "Missing 'userId' parameter" }, { status: 400 });
  }

  try {
    const result = await getTracks(
      parseInt(userId, 10),
      limit ? parseInt(limit, 10) : 200
    );

    // Filter out unplayable tracks
    const playableTracks = result.collection.filter(isTrackPlayable);

    return NextResponse.json({ collection: playableTracks });
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}

