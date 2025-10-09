import { NextRequest, NextResponse } from "next/server";
import { getPlaylistWithTracks } from "@/lib/soundcloud/cached-client";
import { createLogger } from "@/lib/logger";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

const logger = createLogger({ route: 'playlist-tracks' });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const playlistId = searchParams.get("id");

  if (!playlistId) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  try {
    const playlist = await getPlaylistWithTracks(Number(playlistId));
    
    // Filter out tracks with incomplete data
    if (playlist.tracks) {
      const validTracks = playlist.tracks.filter(track => {
        const isValid = track && track.id && track.title;
        if (!isValid) {
          logger.warn('Filtering out invalid track in playlist', { 
            playlistId, 
            trackId: track?.id,
            hasTitle: !!track?.title,
            hasUser: !!track?.user,
            hasDuration: !!track?.duration
          });
        }
        return isValid;
      });
      
      playlist.tracks = validTracks;
    }
    
    return NextResponse.json(playlist);
  } catch (error) {
    logger.error("Error fetching playlist tracks", { playlistId }, error as Error);
    return NextResponse.json(
      { error: ERROR_MESSAGES.API.GENERIC },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

