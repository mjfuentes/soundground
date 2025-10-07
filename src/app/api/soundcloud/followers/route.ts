import { NextRequest, NextResponse } from "next/server";
import { getFollowers } from "@/lib/soundcloud/smart-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const nextHref = searchParams.get("nextHref");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!userId && !nextHref) {
    return NextResponse.json({ error: "Missing 'userId' or 'nextHref' parameter" }, { status: 400 });
  }

  try {
    const response = await getFollowers(
      userId ? parseInt(userId, 10) : 0,
      limit,
      nextHref || undefined
    );

    // Sort by follower count descending
    const sortedFollowers = response.collection.sort(
      (a, b) => b.followers_count - a.followers_count
    );

    return NextResponse.json({ 
      followers: sortedFollowers,
      nextHref: response.next_href 
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch followers", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

