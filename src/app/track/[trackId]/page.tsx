import { notFound } from "next/navigation";
import { TrackView } from "@/components/track-view";

interface PageProps {
  params: Promise<{ trackId: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { trackId } = await params;
  
  // Validate trackId is a number
  if (!/^\d+$/.test(trackId)) {
    notFound();
  }

  return <TrackView trackId={trackId} />;
}

