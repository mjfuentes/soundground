import { NextRequest, NextResponse } from "next/server";
import { getAlbums } from "@/lib/soundcloud/cached-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = searchParams.get("limit");

  if (!userId) {
    return NextResponse.json({ error: "Missing 'userId' parameter" }, { status: 400 });
  }

  try {
    const albums = await getAlbums(Number(userId), limit ? Number(limit) : 200);
    return NextResponse.json(albums);
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

