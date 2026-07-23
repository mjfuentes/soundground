import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistHero } from "@/components/artist/artist-hero";
import {
  AppearsIn,
  ConnectionsList,
  ReleasesList,
} from "@/components/artist/artist-sidebar";
import {
  SharesGrid,
  SpotlightGrid,
  UploadsList,
  toPlayable,
} from "@/components/artist/artist-tracks";
import { BrowseHeader } from "@/components/browse/browse-header";
import { getArtistPresence, getStrongestConnections } from "@/lib/browse/artist-context";
import { resolveRoster } from "@/lib/browse/resolve-artists";
import {
  getAlbums,
  getReposts,
  getTracks,
  resolveProfile,
} from "@/lib/soundcloud/official-cached-client";
import { isWithinLastDay } from "@/lib/browse/format";
import type { SoundCloudPlaylist, SoundCloudTrack } from "@/lib/soundcloud/client";
import { isTrackPlayable } from "@/lib/soundcloud/track-validation";

interface PageProps {
  params: Promise<{ handle: string }>;
}

async function loadProfile(handle: string) {
  try {
    return await resolveProfile(`https://soundcloud.com/${handle}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) return {};
  return {
    title: `${profile.username} — SoundGround`,
    description: `${profile.username} in the underground atlas: uploads, releases, and real connections.`,
  };
}

export default async function ArtistPage({ params }: PageProps) {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) {
    notFound();
  }

  const settle = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  };
  const [tracksResult, albumsResult, repostsResult] = await Promise.all([
    settle(getTracks(profile.id, 50), { collection: [] as SoundCloudTrack[] }),
    settle(getAlbums(profile.id), { collection: [] as SoundCloudPlaylist[] }),
    settle(getReposts(profile.id, 20), { collection: [] as SoundCloudTrack[] }),
  ]);

  const uploads = tracksResult.collection.filter(isTrackPlayable);
  const mostPlayed = [...uploads]
    .sort((a, b) => (b.playback_count ?? 0) - (a.playback_count ?? 0))
    .slice(0, 3)
    .filter((track) => (track.playback_count ?? 0) > 0);
  const reposts = repostsResult.collection
    .filter(isTrackPlayable)
    .filter((track) => track.user?.id !== profile.id);
  const activeNow = isWithinLastDay(uploads[0]?.created_at);

  // Graph context: where they sit in the atlas, who they run with.
  const urn = `soundcloud:users:${profile.id}`;
  const presence = getArtistPresence(urn);
  const connections = getStrongestConnections(urn, 5);
  const resolvedConnections = await resolveRoster(
    connections.map((connection) => ({
      urn: connection.urn,
      permalink: connection.permalink,
      cityRaw: null,
      connections: connection.weight,
      followers: 0,
      plays: 0,
      likes: 0,
      comments: 0,
      trackCount: null,
      otherGenres: [],
    })),
  );

  return (
    <main className="min-h-screen bg-sg-bg font-sg text-sg-ink">
      <BrowseHeader breadcrumb={`Artist / ${profile.username}`} />

      <div className="flex flex-col gap-10 px-5 pb-28 pt-9 sm:px-10 lg:flex-row lg:gap-11">
        <div className="flex w-full flex-none flex-col gap-9 lg:w-80">
          <ArtistHero profile={profile} activeNow={activeNow} />
          <AppearsIn chips={presence} />
          <ReleasesList
            albums={albumsResult.collection}
            trackFor={(album) => {
              const first = album.tracks?.find(isTrackPlayable);
              return first ? toPlayable(first) : null;
            }}
          />
          <ConnectionsList connections={connections} resolved={resolvedConnections} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <SpotlightGrid tracks={mostPlayed} />
          <UploadsList tracks={uploads.slice(0, 12)} />
          <SharesGrid reposts={reposts} />
        </div>
      </div>
    </main>
  );
}
