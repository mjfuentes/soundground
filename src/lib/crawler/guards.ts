/**
 * Heuristics deciding who gets crawled. The atlas maps artists; listener
 * and bot accounts pollute edges and burn the request budget.
 */

interface AccountSignals {
  trackCount?: number | null;
  followersCount?: number | null;
}

/** Worth a full visit: has published at least one track. */
export function isCrawlableArtist(signals: AccountSignals): boolean {
  return (signals.trackCount ?? 0) >= 1;
}

/**
 * Worth enqueueing from a followings/reposts page (cheap pre-filter before
 * we spend requests on a full visit).
 */
export function isEnqueueCandidate(signals: AccountSignals): boolean {
  return isCrawlableArtist(signals);
}
