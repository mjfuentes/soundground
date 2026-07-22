/**
 * Browse name index for the search bar's genre/city quick-jumps.
 * Small payload, cacheable; data only changes on re-aggregation.
 */

import { NextResponse } from "next/server";
import { listBrowseIndex } from "@/lib/browse/store";

export async function GET() {
  try {
    const entries = listBrowseIndex();
    return NextResponse.json(
      { entries },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    console.error("[browse-index] failed:", error);
    return NextResponse.json({ error: "Failed to load browse index" }, { status: 500 });
  }
}
