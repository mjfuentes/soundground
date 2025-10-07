import { NextRequest, NextResponse } from "next/server";
import { getSpotlight } from "@/lib/soundcloud/cached-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing 'userId' parameter" }, { status: 400 });
  }

  try {
    const result = await getSpotlight(Number(userId));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching spotlight:", error);
    return NextResponse.json(
      { error: "Failed to fetch spotlight tracks" },
      { status: 500 }
    );
  }
}

