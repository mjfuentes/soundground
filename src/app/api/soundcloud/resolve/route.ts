import { NextRequest, NextResponse } from "next/server";
import { resolveProfile } from "@/lib/soundcloud/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const profile = await resolveProfile(url);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error resolving profile:", error);
    return NextResponse.json(
      { error: "Failed to resolve SoundCloud profile" },
      { status: 500 }
    );
  }
}

