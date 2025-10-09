import { NextRequest, NextResponse } from "next/server";
import { getTracks } from "@/lib/soundcloud/smart-client";
import { isTrackPlayable } from "@/lib/soundcloud/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ route: "tracks" });

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
    logger.error("Failed to fetch tracks", { userId }, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 }
    );
  }
}

