import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userId: session.userId,
      username: session.username,
    });
  } catch (error) {
    console.error("Error getting user session:", error);
    return NextResponse.json(
      { error: "Failed to get user session" },
      { status: 500 }
    );
  }
}

