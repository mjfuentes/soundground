/** Track duration in ms → "7:40" or "1:02:11". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : mmss;
}

/** "uploaded 2 days ago" style relative time, coarse on purpose. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return days < 14 ? "last week" : `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "last month";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return days < 730 ? "last year" : `${Math.floor(days / 365)} years ago`;
}

/** Whether an ISO timestamp falls within the last 24 hours. */
export function isWithinLastDay(iso: string | undefined, now: number = Date.now()): boolean {
  if (!iso) return false;
  return now - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

/** Compact number formatting for metrics: 950, 2.3k, 1.2M. */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${count}`;
}
