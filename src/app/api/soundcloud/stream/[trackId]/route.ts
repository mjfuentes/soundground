import { NextRequest, NextResponse } from "next/server";
import { getTrack, getTrackStreams } from "@/lib/soundcloud/smart-client";
import { apiV2Get } from "@/lib/soundcloud/client";
import { hasApiV2ClientId, hasOfficialCredentials } from "@/lib/soundcloud/config";
import type { SoundCloudTrack } from "@/lib/soundcloud/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ route: "stream" });

interface StreamPayload {
  stream_url: string;
  format: { protocol: string; mime_type: string };
  quality?: string;
}

/**
 * Official API path: /tracks/{urn}/streams returns direct URLs.
 * Prefer progressive MP3 (best for HTML5 audio), then HLS.
 */
async function resolveOfficialStream(trackId: number): Promise<StreamPayload | null> {
  const streams = await getTrackStreams(trackId);

  if (streams.http_mp3_128_url) {
    return {
      stream_url: streams.http_mp3_128_url,
      format: { protocol: "progressive", mime_type: "audio/mpeg" },
      quality: "sq",
    };
  }
  if (streams.hls_mp3_128_url) {
    return {
      stream_url: streams.hls_mp3_128_url,
      format: { protocol: "hls", mime_type: "audio/mpeg" },
      quality: "sq",
    };
  }
  if (streams.hls_aac_160_url) {
    return {
      stream_url: streams.hls_aac_160_url,
      format: { protocol: "hls", mime_type: 'audio/mp4; codecs="mp4a.40.2"' },
      quality: "hq",
    };
  }
  if (streams.preview_mp3_128_url) {
    return {
      stream_url: streams.preview_mp3_128_url,
      format: { protocol: "progressive", mime_type: "audio/mpeg" },
      quality: "preview",
    };
  }
  return null;
}

interface ApiV2Transcoding {
  url: string;
  preset?: string;
  snipped?: boolean;
  format?: { protocol?: string; mime_type?: string };
  quality?: string;
}

/**
 * api-v2 fallback path: fetch the track's media.transcodings, then request
 * the chosen transcoding URL to obtain the actual stream URL.
 */
async function resolveApiV2Stream(trackId: number): Promise<StreamPayload | null> {
  const track = await apiV2Get<{ media?: { transcodings?: ApiV2Transcoding[] } }>(
    `/tracks/${trackId}`
  );
  const transcodings = track.media?.transcodings ?? [];

  // Prefer progressive MP3, then HLS, then anything.
  const best =
    transcodings.find(
      (t) => t.format?.protocol === "progressive" && t.format?.mime_type?.includes("audio/mpeg")
    ) ??
    transcodings.find((t) => t.format?.protocol === "hls") ??
    transcodings[0];

  if (!best) {
    return null;
  }

  const streamResponse = await apiV2Get<{ url: string }>(best.url);
  return {
    stream_url: streamResponse.url,
    format: {
      protocol: best.format?.protocol ?? "progressive",
      mime_type: best.format?.mime_type ?? "audio/mpeg",
    },
    quality: best.quality,
  };
}

/**
 * GET /api/soundcloud/stream/[trackId]
 *
 * Resolve a playable stream URL for a track. Uses the official API when
 * configured, falling back to api-v2 transcodings otherwise.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const trackIdNum = parseInt(trackId, 10);

    if (isNaN(trackIdNum)) {
      return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
    }

    const track: SoundCloudTrack | null = await getTrack(trackIdNum);
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (track.streamable === false || track.access === "blocked") {
      return NextResponse.json(
        { error: "Track is not streamable", permalink_url: track.permalink_url },
        { status: 403 }
      );
    }

    const stream = hasOfficialCredentials()
      ? await resolveOfficialStream(trackIdNum)
      : hasApiV2ClientId()
        ? await resolveApiV2Stream(trackIdNum)
        : null;

    if (!stream) {
      return NextResponse.json(
        { error: "No playable stream found", permalink_url: track.permalink_url },
        { status: 403 }
      );
    }

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
      stream_url: stream.stream_url,
      format: stream.format,
      quality: stream.quality,
    });
  } catch (error) {
    logger.error("Error resolving stream URL", {}, error as Error);

    if (error instanceof Error && "response" in error) {
      const response = (error as { response?: { statusCode?: number } }).response;
      if (response?.statusCode === 404) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }
      if (response?.statusCode === 403) {
        return NextResponse.json(
          { error: "Access denied - track may be private or geo-blocked" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ error: "Failed to fetch stream URL" }, { status: 500 });
  }
}
