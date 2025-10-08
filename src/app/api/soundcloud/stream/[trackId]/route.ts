import { NextRequest, NextResponse } from "next/server";
import { getSmartClient } from "@/lib/soundcloud/smart-client";
import got from "got";

/**
 * GET /api/soundcloud/stream/[trackId]
 * 
 * Get stream URLs for a track from SoundCloud API.
 * Returns available transcodings (audio formats/qualities) for streaming.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const trackIdNum = parseInt(trackId, 10);

    if (isNaN(trackIdNum)) {
      return NextResponse.json(
        { error: "Invalid track ID" },
        { status: 400 }
      );
    }

    const client = await getSmartClient(request);

    // Fetch track details - includes media.transcodings with stream URLs
    const track = await client.get(`/tracks/${trackIdNum}`);

    // Check if track is streamable
    if (!track.streamable || !track.media?.transcodings) {
      return NextResponse.json(
        { 
          error: "Track is not streamable",
          permalink_url: track.permalink_url
        },
        { status: 403 }
      );
    }

    // Find the best available transcoding
    // Prefer: progressive (direct) > HLS
    const transcodings = track.media.transcodings as Array<{
      url: string;
      preset?: string;
      duration?: number;
      snipped?: boolean;
      format?: { protocol?: string; mime_type?: string };
      quality?: string;
    }>;
    
    // Look for progressive MP3 (best for HTML5 audio)
    let bestTranscoding = transcodings.find((t) => 
      t.format?.protocol === 'progressive' && t.format?.mime_type?.includes('audio/mpeg')
    );
    
    // Fallback to HLS
    if (!bestTranscoding) {
      bestTranscoding = transcodings.find((t) => 
        t.format?.protocol === 'hls'
      );
    }
    
    // Last resort: take first available
    if (!bestTranscoding && transcodings.length > 0) {
      bestTranscoding = transcodings[0];
    }

    if (!bestTranscoding) {
      return NextResponse.json(
        { error: "No playable transcoding found" },
        { status: 403 }
      );
    }

    // The transcoding URL needs to be requested to get the actual stream URL
    // It includes auth token in query params
    const transcodingUrl = bestTranscoding.url;
    
    // Request the transcoding URL to get the actual playable stream
    try {
      console.log(`[Stream ${trackIdNum}] Requesting transcoding URL:`, transcodingUrl);
      console.log(`[Stream ${trackIdNum}] Format:`, bestTranscoding.format);
      
      const streamResponse = await got(transcodingUrl, {
        searchParams: {
          client_id: process.env.SOUNDCLOUD_CLIENT_ID || "REMOVED_CLIENT_ID"
        },
      }).json() as { url: string };

      console.log(`[Stream ${trackIdNum}] Got stream URL:`, streamResponse.url.substring(0, 100) + '...');
      console.log(`[Stream ${trackIdNum}] Protocol:`, bestTranscoding.format?.protocol);

      // Return stream information
      return NextResponse.json({
        id: track.id,
        title: track.title,
        duration: track.duration / 1000, // Convert to seconds
        artwork_url: track.artwork_url,
        permalink_url: track.permalink_url,
        user: {
          id: track.user?.id,
          username: track.user?.username,
          permalink_url: track.user?.permalink_url,
        },
        streamable: track.streamable,
        stream_url: streamResponse.url,
        format: bestTranscoding.format,
        quality: bestTranscoding.quality,
      });
    } catch (streamError) {
      console.error(`[Stream ${trackIdNum}] Error fetching actual stream URL:`, streamError);
      return NextResponse.json(
        { error: "Failed to get playable stream URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching stream URL:", error);
    
    if (error instanceof Error) {
      // Handle specific HTTP errors
      if ('response' in error && typeof error.response === 'object' && error.response) {
        const response = error.response as { statusCode?: number };
        if (response.statusCode === 404) {
          return NextResponse.json(
            { error: "Track not found" },
            { status: 404 }
          );
        }
        if (response.statusCode === 403) {
          return NextResponse.json(
            { error: "Access denied - track may be private or geo-blocked" },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch stream URL" },
      { status: 500 }
    );
  }
}

