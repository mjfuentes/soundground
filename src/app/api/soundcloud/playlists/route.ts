import { NextRequest, NextResponse } from "next/server";
import { getPlaylists } from "@/lib/soundcloud/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = searchParams.get("limit");

  if (!userId) {
    return NextResponse.json({ error: "Missing 'userId' parameter" }, { status: 400 });
  }

  try {
    const playlists = await getPlaylists(Number(userId), limit ? Number(limit) : 200);
    return NextResponse.json(playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

