import Link from "next/link";
import { RichDescription } from "./rich-description";
import { ExpandableSection } from "./expandable-section";
import { TopFollowers } from "./top-followers";
import { TrackCard } from "./track-card";
import { SpotlightPlaylist } from "./spotlight-playlist";
import { ExpandableAlbums } from "./expandable-albums";
import { RecentActivityList } from "./recent-activity-list";
import { ActivityPostCard } from "./activity-post-card";
import { ProfileWithAutoQueue } from "./profile-with-auto-queue";
import { ProfileWithCache } from "./profile-with-cache";
import { ArtistAvatar } from "./artist-avatar";
import { SmartBackButton } from "./smart-back-button";
import { isPlaylist } from "@/lib/soundcloud/client";
import { getServerBaseUrl } from "@/lib/server-base-url";
import { getHighQualityImage } from "@/lib/image-utils";
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
  const { profile: user, spotlight = [], playlists = [], albums = [], tracks = [], reposts = [] } = data ?? {};

  if (!user) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-red-200">
        Unable to load SoundCloud profile. Profile data not available.
      </div>
    );
  }

  const avatar = getHighQualityImage(user.avatar_url) ?? "";

  return (
    <ProfileWithCache
      handle={profile}
      freshData={{
        profile: user,
        spotlight,
        playlists,
        albums,
        tracks,
      }}
    >
      <ProfileWithAutoQueue
        spotlight={spotlight}
        tracks={tracks}
        artistName={user.username}
        artistUrl={user.permalink_url}
      >
        <SmartBackButton />
        <article className="grid gap-8 md:grid-cols-[minmax(260px,320px)_1fr]">
      {/* Left column - Profile info, Albums/Playlists & Friends */}
      <section className="flex flex-col gap-4">
        {avatar ? (
          <div className="h-80 w-80 mx-auto md:mx-0 mb-6">
            <ArtistAvatar avatar={avatar} username={user.username} />
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
        {albums.length > 0 && (
          <ExpandableAlbums albums={albums} title="Albums" />
        )}

        {/* Playlists */}
        {playlists.length > 0 && (
          <ExpandableAlbums albums={playlists} title="Playlists" />
        )}

        {/* Friends - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block">
          <TopFollowers userId={user.id} followerCount={user.followers_count} />
        </div>
      </section>

      {/* Right column - Spotlight & Recent Activity */}
      <section className="flex flex-col gap-6">
        {/* Spotlight - Responsive grid */}
        {spotlight.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-semibold text-white">Spotlight</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
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

        {/* Recent Uploads */}
        {tracks.length > 0 && (
          <RecentActivityList tracks={tracks} />
        )}

        {/* Recent Shares (Reposts) */}
        {reposts.length > 0 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-bold text-white">Recent Shares</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reposts.slice(0, 6).map((track: SoundCloudTrack) => (
                <ActivityPostCard key={track.id} track={track} />
              ))}
            </div>
          </div>
        )}

        {spotlight.length === 0 && playlists.length === 0 && albums.length === 0 && tracks.length === 0 && reposts.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
            No tracks, playlists, or albums found for this artist.
          </div>
        )}
      </section>
    </article>
      </ProfileWithAutoQueue>
    </ProfileWithCache>
  );
}
