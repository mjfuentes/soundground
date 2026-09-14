/** Crawl budgets and pacing (ideas/0003 Phase 1). */

export interface CrawlerConfig {
  maxDepth: number;
  /** Minimum ms between API requests (~1 req/s). */
  minRequestIntervalMs: number;
  /** Pages of followings fetched per expanded artist (200/page). */
  maxFollowingPages: number;
  pageLimit: number;
  /** Consecutive visit failures before the run aborts (auth/network meltdown guard). */
  maxConsecutiveFailures: number;
  /** Wall-clock budget; the run stops gracefully (resumable) when exceeded. Absent = unlimited. */
  maxRuntimeMs?: number;
}

export const DEFAULT_CONFIG: CrawlerConfig = {
  maxDepth: 2,
  minRequestIntervalMs: 1000,
  maxFollowingPages: 3,
  pageLimit: 200,
  maxConsecutiveFailures: 10,
};
