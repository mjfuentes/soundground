import { NextRequest, NextResponse } from "next/server";
import { getCacheService } from "@/lib/cache";
import { getCacheStats } from "@/lib/soundcloud/cached-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  const cache = getCacheService();

  try {
    switch (action) {
      case "stats":
        return NextResponse.json({
          soundcloudStats: getCacheStats(),
          allStats: cache.getStats(),
        });

      case "entries":
        return NextResponse.json({
          entries: cache.getAll(),
        });

      default:
        return NextResponse.json({
          error: "Invalid action. Use 'stats' or 'entries'",
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Error getting cache info:", error);
    return NextResponse.json(
      { error: "Failed to get cache information" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const key = searchParams.get("key");

  const cache = getCacheService();

  try {
    if (key) {
      const deleted = cache.delete(key);
      return NextResponse.json({
        success: deleted,
        message: deleted ? "Cache entry deleted" : "Cache entry not found",
      });
    }

    if (type) {
      const count = cache.deleteByType(type);
      return NextResponse.json({
        success: true,
        deletedCount: count,
        message: `Deleted ${count} entries of type '${type}'`,
      });
    }

    // Clear all cache
    const count = cache.clear();
    // Also cleanup expired entries
    cache.cleanup();
    
    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Cleared all cache (${count} entries)`,
    });
  } catch (error) {
    console.error("Error deleting cache:", error);
    return NextResponse.json(
      { error: "Failed to delete cache" },
      { status: 500 }
    );
  }
}

