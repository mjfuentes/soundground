import {
  isPlaylist,
  isQualityResult,
  isTrack,
  isUser,
  sortSearchResults,
  type SearchResult,
} from "../search-results";

const user = (overrides: Record<string, unknown> = {}): SearchResult =>
  ({
    id: 1,
    permalink: "artist",
    followers_count: 100,
    followings_count: 10,
    avatar_url: "https://example.com/a.jpg",
    track_count: 5,
    ...overrides,
  }) as unknown as SearchResult;

const track = (overrides: Record<string, unknown> = {}): SearchResult =>
  ({
    id: 2,
    user: { id: 1 },
    artwork_url: "https://example.com/t.jpg",
    playback_count: 5000,
    ...overrides,
  }) as unknown as SearchResult;

const playlist = (overrides: Record<string, unknown> = {}): SearchResult =>
  ({
    id: 3,
    user: { id: 1 },
    is_album: false,
    artwork_url: "https://example.com/p.jpg",
    track_count: 10,
    likes_count: 50,
    ...overrides,
  }) as unknown as SearchResult;

describe("type guards", () => {
  it("classifies users, tracks, and playlists", () => {
    expect(isUser(user())).toBe(true);
    expect(isTrack(track())).toBe(true);
    expect(isPlaylist(playlist())).toBe(true);
    expect(isUser(track())).toBe(false);
    expect(isTrack(playlist())).toBe(false);
  });
});

describe("isQualityResult", () => {
  it("rejects users with no avatar, no tracks, and few followers", () => {
    expect(
      isQualityResult(user({ avatar_url: null, track_count: 0, followers_count: 2 })),
    ).toBe(false);
  });

  it("accepts users with an avatar", () => {
    expect(isQualityResult(user({ track_count: 0, followers_count: 0 }))).toBe(true);
  });

  it("rejects artwork-less tracks with few plays", () => {
    expect(isQualityResult(track({ artwork_url: null, playback_count: 10 }))).toBe(false);
  });

  it("accepts high-play tracks without artwork", () => {
    expect(isQualityResult(track({ artwork_url: null, playback_count: 5000 }))).toBe(true);
  });
});

describe("sortSearchResults", () => {
  it("ranks users before tracks before playlists", () => {
    const sorted = sortSearchResults([playlist(), track(), user()]);
    expect(isUser(sorted[0])).toBe(true);
    expect(isTrack(sorted[1])).toBe(true);
    expect(isPlaylist(sorted[2])).toBe(true);
  });

  it("ranks users by follower count", () => {
    const small = user({ id: 10, followers_count: 5 });
    const big = user({ id: 11, followers_count: 5000 });
    const sorted = sortSearchResults([small, big]);
    expect((sorted[0] as { id: number }).id).toBe(11);
  });

  it("does not mutate its input", () => {
    const input = [playlist(), user()];
    const copy = [...input];
    sortSearchResults(input);
    expect(input).toEqual(copy);
  });
});
