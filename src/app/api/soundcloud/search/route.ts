import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/soundcloud/smart-client";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ route: "search" });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const filter = searchParams.get("filter");

  if (!query) {
    return NextResponse.json({ error: "Missing 'q' parameter" }, { status: 400 });
  }

  try {
    const results = await search(query, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      filter: filter as 'tracks' | 'users' | 'playlists' | 'albums' | undefined,
    });

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Search failed", { query }, error as Error);
    return NextResponse.json(
      { error: "Failed to search SoundCloud" },
      { status: 500 }
    );
  }
}

