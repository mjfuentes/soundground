import { notFound } from "next/navigation";
import { PlaylistView } from "@/components/playlist-view";
import { AlbumView } from "@/components/album-view";

interface PageProps {
  params: Promise<{ playlistId: string }>;
}

async function getPlaylistData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/soundcloud/playlist-tracks?id=${id}`, {
      next: { revalidate: 900 } // Cache for 15 minutes
    });
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch {
    return null;
  }
}

export default async function PlaylistPage({ params }: PageProps) {
  const { playlistId } = await params;
  
  // Validate playlistId is a number
  if (!/^\d+$/.test(playlistId)) {
    notFound();
  }

  // Fetch playlist data to determine if it's an album or playlist
  const data = await getPlaylistData(playlistId);
  
  // If it's an album, use AlbumView, otherwise use PlaylistView
  if (data?.is_album) {
    return <AlbumView playlistId={playlistId} />;
  }

  return <PlaylistView playlistId={playlistId} />;
}

