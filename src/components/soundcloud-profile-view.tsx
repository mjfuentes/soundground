import Image from "next/image";
import Link from "next/link";
import { SoundcloudEmbed } from "./soundcloud-embed";
import { RichDescription } from "./rich-description";
import { ExpandableSection } from "./expandable-section";
import { TopFollowers } from "./top-followers";
import { LinkedPlatforms } from "./linked-platforms";

interface SoundcloudProfileViewProps {
  profile: string;
}

export async function SoundcloudProfileView({ profile }: SoundcloudProfileViewProps) {
  const url = profile.startsWith("http") ? profile : `https://soundcloud.com/${profile}`;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/soundcloud/profile?url=${encodeURIComponent(url)}`,
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
  const { profile: user, spotlight, playlists, albums, topFollowers, followersNextHref } = data;

  const avatar = user.avatar_url?.replace("large.jpg", "t500x500.jpg") ?? "";

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(260px,320px)_1fr]">
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
              className="text-orange-500 transition hover:text-orange-400"
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
                  {topFollowers && topFollowers.length > 0 && (
                    <TopFollowers initialFollowers={topFollowers} />
                  )}
                  <LinkedPlatforms soundcloudPermalink={user.permalink} />
                </div>
      </section>
      <section className="flex flex-col gap-6">
        {spotlight.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Spotlight</h3>
            <div className="flex flex-col gap-3">
              {spotlight.map((item: any) => (
                <SoundcloudEmbed key={item.id} url={item.permalink_url} visual={true} />
              ))}
            </div>
          </div>
        )}

        {playlists.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Playlists</h3>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {playlists.map((playlist: any) => (
                <Link
                  key={playlist.id}
                  href={playlist.permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
                    {playlist.artwork_url ? (
                      <Image
                        src={playlist.artwork_url.replace("large.jpg", "t500x500.jpg")}
                        alt={playlist.title}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(min-width: 768px) 33vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                        <svg className="h-12 w-12 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-purple-400">{playlist.title}</h4>
                    <p className="text-xs text-zinc-400">{playlist.track_count} tracks</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {albums.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Albums</h3>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {albums.map((album: any) => (
                <Link
                  key={album.id}
                  href={album.permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
                    {album.artwork_url ? (
                      <Image
                        src={album.artwork_url.replace("large.jpg", "t500x500.jpg")}
                        alt={album.title}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(min-width: 768px) 33vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                        <svg className="h-12 w-12 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-purple-400">{album.title}</h4>
                    <p className="text-xs text-zinc-400">{album.track_count} tracks</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {spotlight.length === 0 && playlists.length === 0 && albums.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
            No tracks, playlists, or albums found for this artist.
          </div>
        )}
      </section>
    </article>
  );
}
