import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/soundcloud/smart-client";
import { createLogger } from "@/lib/logger";
import { stabilizeSearchResults } from "@/lib/search-stabilizer";

const logger = createLogger({ route: "search" });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const filter = searchParams.get("filter");
  const stabilize = searchParams.get("stabilize") !== "false"; // Default true

  if (!query) {
    return NextResponse.json({ error: "Missing 'q' parameter" }, { status: 400 });
  }

  try {
    // Fetch raw results from SoundCloud
    const rawResults = await search(query, {
      limit: limit ? parseInt(limit, 10) : 40, // Fetch more to have better pool for stabilization
      offset: offset ? parseInt(offset, 10) : 0,
      filter: filter as 'tracks' | 'users' | 'playlists' | 'albums' | undefined,
    });

    // Stabilize results using fuzzy matching and historical data
    const stabilizedResults = stabilize
      ? stabilizeSearchResults(query, rawResults.collection || [])
      : rawResults.collection || [];

    const response = NextResponse.json({
      collection: stabilizedResults,
      total_results: stabilizedResults.length,
      next_href: rawResults.next_href,
      query_urn: rawResults.query_urn
    });

    response.headers.set('X-Stabilized', stabilize ? 'true' : 'false');

    return response;
  } catch (error) {
    logger.error("Search failed", { query }, error as Error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
