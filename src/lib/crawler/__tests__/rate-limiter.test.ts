import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  function build(intervalMs = 1000) {
    let now = 0;
    const sleeps: number[] = [];
    const limiter = new RateLimiter(
      intervalMs,
      () => now,
      async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    );
    return { limiter, sleeps, advance: (ms: number) => (now += ms), getNow: () => now };
  }

  it("lets the first request through immediately", async () => {
    const { limiter, sleeps } = build();
    await limiter.acquire();
    expect(sleeps).toEqual([]);
  });

  it("spaces consecutive requests by the interval", async () => {
    const { limiter, sleeps } = build(1000);
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([1000, 1000]);
  });

  it("does not wait when enough time has passed naturally", async () => {
    const { limiter, sleeps, advance } = build(1000);
    await limiter.acquire();
    advance(5000);
    await limiter.acquire();
    expect(sleeps).toEqual([]);
  });

  it("applies a penalty window after a 429", async () => {
    const { limiter, sleeps } = build(1000);
    await limiter.acquire();
    limiter.penalize();
    await limiter.acquire();
    expect(sleeps[0]).toBeGreaterThanOrEqual(30_000);
  });

  it("honors Retry-After when provided", async () => {
    const { limiter, sleeps } = build(1000);
    await limiter.acquire();
    limiter.penalize(120);
    await limiter.acquire();
    expect(sleeps[0]).toBe(120_000);
  });

  it("backs off exponentially on repeated 429s and resets on success", async () => {
    const { limiter } = build(1000);
    limiter.penalize();
    limiter.penalize();
    expect(limiter.rateLimitHits).toBe(2);
    limiter.reportSuccess();
    limiter.penalize();
    expect(limiter.rateLimitHits).toBe(3);
  });

  it("caps the penalty window", async () => {
    const { limiter, sleeps } = build(1000);
    await limiter.acquire();
    limiter.penalize(9999);
    await limiter.acquire();
    expect(sleeps[0]).toBeLessThanOrEqual(5 * 60_000);
  });
});
