import type { SoundCloudUser } from "@/lib/soundcloud/client";

interface ProfileStatsProps {
  user: SoundCloudUser;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const stats = [
    { label: "TRACKS", value: user.track_count, symbol: "♪" },
    { label: "LIKES", value: user.public_favorites_count || 0, symbol: "★" },
    { label: "REPOSTS", value: user.reposts_count || 0, symbol: "↻" },
    { label: "PLAYLISTS", value: user.playlist_count, symbol: "≡" },
  ];

  // Only show if there's at least some activity
  const hasActivity = stats.some(stat => stat.value > 0);
  if (!hasActivity) return null;

  return (
    <div className="border-2 border-black bg-white p-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-2 border-b-2 border-black pb-1 text-xs font-bold uppercase tracking-wider">
        USER ACTIVITY
      </div>
      <div className="space-y-1.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between border-b border-gray-300 pb-1 last:border-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{stat.symbol}</span>
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <span className="font-bold tabular-nums">{formatNumber(stat.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

