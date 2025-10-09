import { NextRequest, NextResponse } from "next/server";
import { getTracks } from "@/lib/soundcloud/smart-client";
import { createLogger } from "@/lib/logger";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

const logger = createLogger({ route: 'user-tracks' });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!userId) {
    return NextResponse.json(
      { error: "Missing 'userId' parameter" },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  try {
    const tracks = await getTracks(Number(userId), limit);
    
    return NextResponse.json({ tracks });
  } catch (error) {
    logger.error("Error fetching user tracks", { userId, limit }, error as Error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.API.GENERIC },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

