/**
 * BFS crawler v0 (ideas/0003 Phase 1): seeds → profile + tracks + reposts +
 * followings, writing URNs/edges/terms to the graph store. Resumable at any
 * point via the crawl_queue; pacing and 429 handling via RateLimiter.
 */

import type {
  SoundCloudFollower,
  SoundCloudTrack,
  SoundCloudUser,
} from "@/lib/soundcloud/client";
import { urnToId, userUrn } from "@/lib/soundcloud/official-client";
import type { GraphRepository, RunStats } from "@/lib/graph/repository";
import type { CrawlerConfig } from "./config";
import { followEdges, observeTracks, repostEdges } from "./extract";
import { isCrawlableArtist, isEnqueueCandidate } from "./guards";
import type { RateLimiter } from "./rate-limiter";

export interface CrawlerApi {
  getUser(userId: number): Promise<SoundCloudUser>;
  getTracks(userId: number, limit?: number): Promise<{ collection: SoundCloudTrack[] }>;
  getReposts(userId: number, limit?: number): Promise<{ collection: SoundCloudTrack[] }>;
  getFollowings(
    userId: number,
    limit?: number,
    nextHref?: string,
  ): Promise<{ collection: SoundCloudFollower[]; next_href?: string }>;
}

export type CrawlLogger = (message: string) => void;

const PACED_ATTEMPTS = 3;

interface HttpishError {
  response?: { statusCode?: number; headers?: Record<string, string | string[] | undefined> };
}

function rateLimitInfo(error: unknown): { hit: boolean; retryAfterSeconds?: number } {
  const response = (error as HttpishError).response;
  if (response?.statusCode !== 429) return { hit: false };
  const header = response.headers?.["retry-after"];
  const seconds = Number(Array.isArray(header) ? header[0] : header);
  return { hit: true, retryAfterSeconds: Number.isFinite(seconds) ? seconds : undefined };
}

/**
 * Rate-limited call with 429 backoff and bounded retries. Shared by the
 * crawl loop and one-off paced calls like seed resolution.
 */
export async function pacedCall<T>(
  limiter: RateLimiter,
  call: () => Promise<T>,
  log: CrawlLogger = () => undefined,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    await limiter.acquire();
    try {
      const result = await call();
      limiter.reportSuccess();
      return result;
    } catch (error) {
      const { hit, retryAfterSeconds } = rateLimitInfo(error);
      if (!hit || attempt >= PACED_ATTEMPTS) throw error;
      limiter.penalize(retryAfterSeconds);
      log(`429 received — backing off (attempt ${attempt}/${PACED_ATTEMPTS})`);
    }
  }
}

export class Crawler {
  private interrupted = false;
  private artistsVisited = 0;
  private edgesWritten = 0;
  private termsWritten = 0;
  private requestsMade = 0;
  private failures = 0;

  constructor(
    private readonly repo: GraphRepository,
    private readonly limiter: RateLimiter,
    private readonly api: CrawlerApi,
    private readonly config: CrawlerConfig,
    private readonly log: CrawlLogger = () => undefined,
  ) {}

  /** Ask the run loop to stop after the current visit (SIGINT handler). */
  requestInterrupt(): void {
    this.interrupted = true;
  }

  get wasInterrupted(): boolean {
    return this.interrupted;
  }

  async run(seedUrns: readonly string[]): Promise<RunStats> {
    const recovered = this.repo.resetInProgress();
    if (recovered > 0) {
      this.log(`recovered ${recovered} in-progress items from a previous run`);
    }

    for (const urn of seedUrns) {
      this.repo.upsertArtist({ urn, depth: 0, discoveredVia: "seed" });
      this.repo.enqueue(urn, 0);
    }

    const deadline = this.config.maxRuntimeMs ? Date.now() + this.config.maxRuntimeMs : null;
    let consecutiveFailures = 0;
    for (;;) {
      if (deadline && Date.now() > deadline) {
        this.log("time budget reached — stopping gracefully (queue is resumable)");
        this.interrupted = true;
      }
      if (this.interrupted) break;
      const item = this.repo.claimNext();
      if (!item) break;

      try {
        await this.visit(item.urn, item.depth);
        this.repo.markDone(item.urn);
        consecutiveFailures = 0;
        this.artistsVisited += 1;
        if (this.artistsVisited % 25 === 0) {
          this.log(
            `${this.artistsVisited} visited · ${this.edgesWritten} edges · ` +
              `${this.repo.pendingCount()} pending · ${this.requestsMade} requests`,
          );
        }
      } catch (error) {
        this.failures += 1;
        consecutiveFailures += 1;
        this.repo.markFailed(item.urn);
        this.log(`visit failed for ${item.urn}: ${error instanceof Error ? error.message : error}`);
        if (consecutiveFailures >= this.config.maxConsecutiveFailures) {
          throw new Error(
            `${consecutiveFailures} consecutive visit failures — aborting run (check credentials/network)`,
          );
        }
      }
    }

    return this.stats();
  }

  stats(): RunStats {
    return {
      artistsVisited: this.artistsVisited,
      edgesWritten: this.edgesWritten,
      termsWritten: this.termsWritten,
      requestsMade: this.requestsMade,
      rateLimitHits: this.limiter.rateLimitHits,
      failures: this.failures,
    };
  }

  private async visit(urn: string, depth: number): Promise<void> {
    const userId = urnToId(urn);

    const profile = await this.paced(() => this.api.getUser(userId));
    this.repo.upsertArtist({
      urn,
      permalink: profile.permalink,
      cityRaw: profile.city ?? null,
      countryCode: profile.country_code ?? null,
      trackCount: profile.track_count,
      followersCount: profile.followers_count,
      depth,
    });

    if (!isCrawlableArtist({ trackCount: profile.track_count })) {
      this.repo.markCrawled(urn);
      return;
    }

    await this.collectTracks(urn, userId);
    await this.collectReposts(urn, userId, depth);
    if (depth < this.config.maxDepth) {
      await this.collectFollowings(urn, userId, depth);
    }
    this.repo.markCrawled(urn);
  }

  private async collectTracks(urn: string, userId: number): Promise<void> {
    const { collection } = await this.paced(() =>
      this.api.getTracks(userId, this.config.pageLimit),
    );
    const { terms, purchaseUrls, lastUploadAt, engagement } = observeTracks(urn, collection);
    for (const term of terms) {
      this.repo.recordTerm(term);
      this.termsWritten += 1;
    }
    for (const url of purchaseUrls) {
      this.repo.recordPurchaseLink(urn, url);
    }
    if (lastUploadAt) {
      this.repo.recordLastUpload(urn, lastUploadAt);
    }
    if (collection.length > 0) {
      this.repo.recordEngagement(urn, engagement);
    }
  }

  private async collectReposts(urn: string, userId: number, depth: number): Promise<void> {
    const { collection } = await this.paced(() =>
      this.api.getReposts(userId, this.config.pageLimit),
    );
    for (const edge of repostEdges(urn, collection)) {
      this.repo.recordEdge(edge);
      this.edgesWritten += 1;
      // A reposted artist definitionally has ≥1 track — always a candidate.
      this.repo.upsertArtist({ urn: edge.dstUrn, depth: depth + 1, discoveredVia: "repost" });
      if (depth < this.config.maxDepth) {
        this.repo.enqueue(edge.dstUrn, depth + 1);
      }
    }
  }

  private async collectFollowings(urn: string, userId: number, depth: number): Promise<void> {
    let nextHref: string | undefined;
    for (let page = 0; page < this.config.maxFollowingPages; page++) {
      const result = await this.paced(() =>
        this.api.getFollowings(userId, this.config.pageLimit, nextHref),
      );
      for (const edge of followEdges(urn, result.collection)) {
        this.repo.recordEdge(edge);
        this.edgesWritten += 1;
      }
      for (const followed of result.collection) {
        if (!followed.id || !isEnqueueCandidate({ trackCount: followed.track_count })) continue;
        this.repo.upsertArtist({
          urn: userUrn(followed.id),
          permalink: followed.permalink,
          cityRaw: followed.city ?? null,
          countryCode: followed.country_code ?? null,
          trackCount: followed.track_count,
          followersCount: followed.followers_count,
          depth: depth + 1,
          discoveredVia: "following",
        });
        this.repo.enqueue(userUrn(followed.id), depth + 1);
      }
      nextHref = result.next_href;
      if (!nextHref || this.interrupted) break;
    }
  }

  private async paced<T>(call: () => Promise<T>): Promise<T> {
    this.requestsMade += 1;
    return pacedCall(this.limiter, call, this.log);
  }
}
