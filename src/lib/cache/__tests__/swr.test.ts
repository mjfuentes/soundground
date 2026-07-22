/**
 * Stale-while-revalidate behavior of CacheService
 * @jest-environment node
 */
import { CacheService } from "../service";
import { closeDatabase } from "../database";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CacheService stale-while-revalidate", () => {
  let cache: CacheService;

  beforeEach(() => {
    closeDatabase();
    process.env.CACHE_DB_PATH = ":memory:";
    cache = new CacheService();
  });

  afterEach(() => {
    closeDatabase();
    delete process.env.CACHE_DB_PATH;
  });

  it("serves fresh entries without calling the factory", async () => {
    const factory = jest.fn().mockResolvedValue("fresh");
    await cache.getOrSet("k", factory, { ttl: 1000, staleTtl: 5000 });
    const second = await cache.getOrSet("k", factory, { ttl: 1000, staleTtl: 5000 });
    expect(second).toBe("fresh");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("serves stale entries instantly and refreshes in the background", async () => {
    const factory = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 60_000 });
    await sleep(25); // past freshness, within stale retention

    // The refresh writes with the options of the triggering call — long ttl
    // here so the refreshed entry is verifiably fresh afterwards.
    const served = await cache.getOrSet("k", factory, { ttl: 60_000, staleTtl: 60_000 });
    expect(served).toBe("v1"); // stale value served immediately

    await sleep(10); // let the background refresh land
    expect(factory).toHaveBeenCalledTimes(2);
    expect(cache.get("k")).toBe("v2"); // refreshed value now fresh
  });

  it("dedupes concurrent background refreshes", async () => {
    let resolveRefresh: (value: string) => void = () => undefined;
    const factory = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolveRefresh = resolve)));
    await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 60_000 });
    await sleep(25);

    await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 60_000 });
    await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 60_000 });
    expect(factory).toHaveBeenCalledTimes(2); // one initial + one in-flight refresh
    resolveRefresh("v2");
  });

  it("misses (and awaits the factory) beyond stale retention", async () => {
    const factory = jest.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 10 });
    await sleep(30); // past freshness AND retention

    const value = await cache.getOrSet("k", factory, { ttl: 10, staleTtl: 10 });
    expect(value).toBe("v2");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("keeps classic fresh-or-gone behavior without staleTtl", async () => {
    const factory = jest.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    await cache.getOrSet("k", factory, { ttl: 10 });
    await sleep(25);

    const value = await cache.getOrSet("k", factory, { ttl: 10 });
    expect(value).toBe("v2"); // no stale serving — factory awaited
  });

  it("get() never returns stale entries", async () => {
    cache.set("k", "v1", { ttl: 10, staleTtl: 60_000 });
    await sleep(25);
    expect(cache.get("k")).toBeNull();
  });

  it("peekRetained returns stale-but-retained entries", async () => {
    cache.set("k", "v1", { ttl: 10, staleTtl: 60_000 });
    await sleep(25);
    expect(cache.peekRetained("k")).toBe("v1");
  });

  it("peekRetained returns null beyond retention", async () => {
    cache.set("k", "v1", { ttl: 10, staleTtl: 10 });
    await sleep(30);
    expect(cache.peekRetained("k")).toBeNull();
  });
});
