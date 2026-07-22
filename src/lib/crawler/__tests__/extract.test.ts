import { followEdges, observeTracks, parseTagList, repostEdges } from "../extract";
import type { SoundCloudFollower, SoundCloudTrack } from "@/lib/soundcloud/client";

const follower = (id: number, overrides: Partial<SoundCloudFollower> = {}): SoundCloudFollower => ({
  id,
  permalink: `user-${id}`,
  username: `User ${id}`,
  followers_count: 100,
  track_count: 5,
  ...overrides,
});

const track = (overrides: Partial<SoundCloudTrack> = {}): SoundCloudTrack =>
  ({
    id: 1,
    title: "t",
    permalink_url: "",
    duration: 0,
    user: { id: 9, username: "owner", permalink_url: "" },
    ...overrides,
  }) as SoundCloudTrack;

describe("parseTagList", () => {
  it("splits space-separated tags", () => {
    expect(parseTagList("techno dub ambient")).toEqual(["techno", "dub", "ambient"]);
  });

  it("keeps quoted multi-word tags together", () => {
    expect(parseTagList('techno "deep house" dub')).toEqual(["techno", "deep house", "dub"]);
  });

  it("lowercases and drops single-character noise", () => {
    expect(parseTagList('TECHNO x "Dub Techno"')).toEqual(["techno", "dub techno"]);
  });

  it("handles empty and undefined input", () => {
    expect(parseTagList(undefined)).toEqual([]);
    expect(parseTagList("")).toEqual([]);
  });
});

describe("followEdges", () => {
  it("creates follow edges from followings", () => {
    const edges = followEdges("soundcloud:users:1", [follower(2), follower(3)]);
    expect(edges).toEqual([
      expect.objectContaining({
        srcUrn: "soundcloud:users:1",
        dstUrn: "soundcloud:users:2",
        type: "follow",
        weight: 1,
      }),
      expect.objectContaining({ dstUrn: "soundcloud:users:3" }),
    ]);
  });

  it("skips self-follows", () => {
    expect(followEdges("soundcloud:users:2", [follower(2)])).toEqual([]);
  });
});

describe("repostEdges", () => {
  it("groups reposts by track owner with count as weight", () => {
    const edges = repostEdges("soundcloud:users:1", [
      track({ user: { id: 7, username: "", permalink_url: "" } }),
      track({ user: { id: 7, username: "", permalink_url: "" } }),
      track({ user: { id: 8, username: "", permalink_url: "" } }),
    ]);
    expect(edges).toContainEqual(
      expect.objectContaining({ dstUrn: "soundcloud:users:7", type: "repost", weight: 2 }),
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ dstUrn: "soundcloud:users:8", weight: 1 }),
    );
  });

  it("ignores self-reposts and ownerless tracks", () => {
    const edges = repostEdges("soundcloud:users:7", [
      track({ user: { id: 7, username: "", permalink_url: "" } }),
      track({ user: undefined as unknown as SoundCloudTrack["user"] }),
    ]);
    expect(edges).toEqual([]);
  });
});

describe("observeTracks", () => {
  it("counts genre and tag evidence across tracks", () => {
    const { terms } = observeTracks("soundcloud:users:1", [
      track({ genre: "Dub Techno", tag_list: 'dub "tape hiss"' }),
      track({ genre: "dub techno", tag_list: "dub" }),
    ]);
    expect(terms).toContainEqual({
      artistUrn: "soundcloud:users:1",
      term: "dub techno",
      kind: "genre",
      evidence: 2,
    });
    expect(terms).toContainEqual(
      expect.objectContaining({ term: "dub", kind: "tag", evidence: 2 }),
    );
    expect(terms).toContainEqual(
      expect.objectContaining({ term: "tape hiss", kind: "tag", evidence: 1 }),
    );
  });

  it("collects unique http purchase urls", () => {
    const { purchaseUrls } = observeTracks("soundcloud:users:1", [
      track({ purchase_url: "https://label.bandcamp.com/album/x" }),
      track({ purchase_url: "https://label.bandcamp.com/album/x" }),
      track({ purchase_url: "not-a-url" }),
    ]);
    expect(purchaseUrls).toEqual(["https://label.bandcamp.com/album/x"]);
  });

  it("finds the latest upload time", () => {
    const { lastUploadAt } = observeTracks("soundcloud:users:1", [
      track({ created_at: "2026/01/10 12:00:00 +0000" }),
      track({ created_at: "2026/07/01 12:00:00 +0000" }),
    ]);
    expect(lastUploadAt).toBe("2026-07-01T12:00:00.000Z");
  });

  it("handles tracks with no metadata", () => {
    const result = observeTracks("soundcloud:users:1", [track()]);
    expect(result).toEqual({
      terms: [],
      purchaseUrls: [],
      lastUploadAt: null,
      engagement: { plays: 0, likes: 0, comments: 0 },
    });
  });

  it("sums engagement across tracks", () => {
    const { engagement } = observeTracks("soundcloud:users:1", [
      track({ playback_count: 1000, likes_count: 50, comment_count: 5 } as Partial<SoundCloudTrack>),
      track({ playback_count: 500, likes_count: 25 } as Partial<SoundCloudTrack>),
    ]);
    expect(engagement).toEqual({ plays: 1500, likes: 75, comments: 5 });
  });
});
