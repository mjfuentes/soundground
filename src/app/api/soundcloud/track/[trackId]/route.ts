import { NextRequest, NextResponse } from "next/server";
import { getTrack } from "@/lib/soundcloud/smart-client";

interface RouteContext {
  params: Promise<{ trackId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { trackId } = await context.params;
  
  // Validate trackId is a number
  if (!/^\d+$/.test(trackId)) {
    return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
  }

  try {
    const track = await getTrack(parseInt(trackId, 10));
    
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    return NextResponse.json({ track });
  } catch (error) {
    console.error("Error fetching track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}

