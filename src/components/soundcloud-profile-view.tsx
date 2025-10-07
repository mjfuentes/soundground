import Image from "next/image";
import Link from "next/link";
import { RichDescription } from "./rich-description";
import { ExpandableSection } from "./expandable-section";
import { TopFollowers } from "./top-followers";
import { TrackCard } from "./track-card";
import { SpotlightPlaylist } from "./spotlight-playlist";
import { AlbumCard } from "./album-card";
import { isPlaylist } from "@/lib/soundcloud/client";
import { getServerBaseUrl } from "@/lib/server-base-url";
import type { SoundCloudTrack, SoundCloudPlaylist, SpotlightItem } from "@/lib/soundcloud/client";

interface SoundcloudProfileViewProps {
  profile: string;
}

export async function SoundcloudProfileView({ profile }: SoundcloudProfileViewProps) {
  const url = profile.startsWith("http") ? profile : `https://soundcloud.com/${profile}`;

  const apiUrl = getServerBaseUrl();
    
  const response = await fetch(
    `${apiUrl}/api/soundcloud/profile?url=${encodeURIComponent(url)}`,
    { next: { revalidate: 300 } }
  );

  if (!response.ok) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-red-200">
        Unable to load SoundCloud profile. Please verify the link and try again.
      </div>
    );
  }

  const data = await response.json();
  const { profile: user, spotlight = [], playlists = [], albums = [], tracks = [] } = data ?? {};

  if (!user) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-red-200">
        Unable to load SoundCloud profile. Profile data not available.
      </div>
    );
  }

  const avatar = user.avatar_url?.replace("large.jpg", "t500x500.jpg") ?? "";

  // Separate albums and playlists for the sidebar - show last 3
  const displayedAlbums = albums.slice(-3).reverse();
  const hasMoreAlbums = albums.length > 3;
  const displayedPlaylists = playlists.slice(-3).reverse();
  const hasMorePlaylists = playlists.length > 3;

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(260px,320px)_1fr]">
      {/* Left column - Profile info, Albums/Playlists & Friends */}
      <section className="flex flex-col gap-4">
        {avatar ? (
          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
            <Image src={avatar} alt={`${user.username} avatar`} fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" />
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold text-white">{user.username}</h2>
            <Link
              href={user.permalink_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white transition hover:text-zinc-300"
              title="View on SoundCloud"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-1.712-1.304-3.106-2.911-3.106h-.21z"/>
              </svg>
            </Link>
          </div>
          {user.description ? (
            <ExpandableSection maxHeight="12rem">
              <RichDescription text={user.description} />
            </ExpandableSection>
          ) : null}
        </div>

        {/* Albums */}
        {displayedAlbums.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-zinc-400">Albums</h3>
            <div className="grid grid-cols-3 gap-2">
              {displayedAlbums.map((album: SoundCloudPlaylist) => {
                // If album has only one track, render it as a track
                if (album.tracks?.length === 1) {
                  return <TrackCard key={album.id} track={album.tracks[0]} showStats={false} coverOnly={true} />;
                }
                return <AlbumCard key={album.id} album={album} showStats={false} coverOnly={true} />;
              })}
            </div>
            {hasMoreAlbums && (
              <button className="cursor-pointer self-start text-xs text-amber-400 transition hover:text-amber-300">
                ...more
              </button>
            )}
          </div>
        )}

        {/* Playlists */}
        {displayedPlaylists.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-zinc-400">Playlists</h3>
            <div className="grid grid-cols-3 gap-2">
              {displayedPlaylists.map((playlist: SoundCloudPlaylist) => {
                // If playlist has only one track, render it as a track
                if (playlist.tracks?.length === 1) {
                  return <TrackCard key={playlist.id} track={playlist.tracks[0]} showStats={false} coverOnly={true} />;
                }
                return <AlbumCard key={playlist.id} album={playlist} showStats={false} coverOnly={true} />;
              })}
            </div>
            {hasMorePlaylists && (
              <button className="cursor-pointer self-start text-xs text-amber-400 transition hover:text-amber-300">
                ...more
              </button>
            )}
          </div>
        )}

        {/* Friends */}
        <TopFollowers userId={user.id} />
      </section>

      {/* Right column - Spotlight & Recent Activity */}
      <section className="flex flex-col gap-6">
        {/* Spotlight - Row of 5 covers */}
        {spotlight.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-zinc-400">Spotlight</h3>
            <div className="grid grid-cols-5 gap-2">
              {spotlight.slice(0, 5).map((item: SpotlightItem) => {
                // If it's a playlist with only one track, treat it as a single track
                if (isPlaylist(item) && item.tracks?.length === 1) {
                  return <TrackCard key={item.id} track={item.tracks[0]} coverOnly={true} />;
                }
                // Otherwise render as normal
                return isPlaylist(item) ? (
                  <SpotlightPlaylist key={item.id} playlist={item} coverOnly={true} />
                ) : (
                  <TrackCard key={item.id} track={item} coverOnly={true} />
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity - Main focus */}
        {tracks.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
            <div className="flex flex-col gap-2">
              {tracks.map((track: SoundCloudTrack) => (
                <TrackCard key={track.id} track={track} showStats={true} />
              ))}
            </div>
          </div>
        )}

        {spotlight.length === 0 && playlists.length === 0 && albums.length === 0 && tracks.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
            No tracks, playlists, or albums found for this artist.
          </div>
        )}
      </section>
    </article>
  );
}
