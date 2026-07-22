/**
 * Token-bucket pacing for the crawl: at most one request per interval,
 * with penalty windows after 429s. Retry-After is honored up to a 5-minute
 * cap (a livelock guard — a server asking for more gets the cap, and the
 * bounded pacedCall retries will surface the failure instead of stalling).
 */

const DEFAULT_PENALTY_MS = 30_000;
const MAX_PENALTY_MS = 5 * 60_000;

type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private nextAllowedAt = 0;
  private consecutivePenalties = 0;
  private rateLimitHitCount = 0;

  constructor(
    private readonly intervalMs: number,
    private readonly clock: () => number = Date.now,
    private readonly sleep: Sleep = realSleep,
  ) {}

  /** Wait until the next request slot is available. */
  async acquire(): Promise<void> {
    const now = this.clock();
    const waitMs = Math.max(0, this.nextAllowedAt - now);
    this.nextAllowedAt = Math.max(now, this.nextAllowedAt) + this.intervalMs;
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
  }

  /**
   * Push the next slot out after a 429. Repeated hits back off exponentially;
   * a successful request (reportSuccess) resets the ladder.
   */
  penalize(retryAfterSeconds?: number): void {
    this.rateLimitHitCount += 1;
    this.consecutivePenalties += 1;
    const backoffMs = Math.min(
      DEFAULT_PENALTY_MS * 2 ** (this.consecutivePenalties - 1),
      MAX_PENALTY_MS,
    );
    const penaltyMs = retryAfterSeconds ? retryAfterSeconds * 1000 : backoffMs;
    this.nextAllowedAt = this.clock() + Math.min(Math.max(penaltyMs, this.intervalMs), MAX_PENALTY_MS);
  }

  reportSuccess(): void {
    this.consecutivePenalties = 0;
  }

  get rateLimitHits(): number {
    return this.rateLimitHitCount;
  }
}
