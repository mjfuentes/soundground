import type { SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

// Profile statistics component
interface ProfileStatsProps {
  tracks: SoundCloudTrack[];
  playlists: SoundCloudPlaylist[];
  albums: SoundCloudPlaylist[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function ProfileStats({ tracks, playlists, albums }: ProfileStatsProps) {
  // Calculate total stats
  const totalLikes = [
    ...tracks.map(t => t.likes_count || 0),
    ...playlists.map(p => p.likes_count || 0),
    ...albums.map(a => a.likes_count || 0)
  ].reduce((sum, count) => sum + count, 0);
  
  const totalReposts = [
    ...tracks.map(t => t.reposts_count || 0),
    ...playlists.map(p => p.reposts_count || 0),
    ...albums.map(a => a.reposts_count || 0)
  ].reduce((sum, count) => sum + count, 0);

  const totalComments = tracks.reduce((sum, track) => sum + (track.comment_count || 0), 0);

  const stats = [
    { label: "Total Likes", value: totalLikes, icon: "♥" },
    { label: "Total Reposts", value: totalReposts, icon: "↻" },
    { label: "Total Comments", value: totalComments, icon: "💬" },
  ].filter(stat => stat.value > 0);

  if (stats.length === 0) return null;

  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
      <h3 className="mb-3 text-sm font-semibold text-purple-300">Engagement Stats</h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/5 p-3">
            <div className="mb-1 text-xs text-zinc-400">{stat.label}</div>
            <div className="text-lg font-bold text-white">{formatNumber(stat.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

