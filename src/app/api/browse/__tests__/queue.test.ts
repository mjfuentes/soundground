/**
 * Tests for /api/browse/queue — scene/artist queue builder
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "../queue/route";

const mockGetTracks = jest.fn();
jest.mock("@/lib/soundcloud/official-cached-client", () => ({
  getTracks: (...args: unknown[]) => mockGetTracks(...args),
}));

const mockGetGenreDetail = jest.fn();
const mockGetCityDetail = jest.fn();
jest.mock("@/lib/browse/store", () => ({
  getGenreDetail: (...args: unknown[]) => mockGetGenreDetail(...args),
  getCityDetail: (...args: unknown[]) => mockGetCityDetail(...args),
}));

const track = (id: number, ownerId: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Track ${id}`,
  permalink_url: `https://soundcloud.com/artist-${ownerId}/track-${id}`,
  duration: 60_000,
  artwork_url: `https://i1.sndcdn.com/art-${id}.jpg`,
  user: {
    id: ownerId,
    username: `Artist ${ownerId}`,
    permalink_url: `https://soundcloud.com/artist-${ownerId}`,
  },
  ...overrides,
});

const rosterEntry = (id: number) => ({ urn: `soundcloud:users:${id}` });

const req = (qs: string) => new NextRequest(`http://localhost/api/browse/queue${qs}`);

describe("/api/browse/queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests without exactly one scope", async () => {
    expect((await GET(req(""))).status).toBe(400);
    expect((await GET(req("?genre=a&city=b"))).status).toBe(400);
  });

  it("404s for an unknown scene", async () => {
    mockGetGenreDetail.mockReturnValue(null);
    expect((await GET(req("?genre=polka"))).status).toBe(404);
  });

  it("builds an interleaved queue from the genre roster", async () => {
    mockGetGenreDetail.mockReturnValue({ roster: [rosterEntry(1), rosterEntry(2)] });
    mockGetTracks.mockImplementation(async (userId: number) => ({
      collection: [track(userId * 10 + 1, userId), track(userId * 10 + 2, userId)],
    }));

    const response = await GET(req("?genre=dub-techno"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items.map((item: { id: number }) => item.id)).toEqual([11, 21, 12, 22]);
    expect(data.items[0]).toEqual(
      expect.objectContaining({
        artist: "Artist 1",
        type: "track",
        url: "https://soundcloud.com/artist-1/track-11",
      }),
    );
  });

  it("filters unplayable tracks", async () => {
    mockGetGenreDetail.mockReturnValue({ roster: [rosterEntry(1)] });
    mockGetTracks.mockResolvedValue({
      collection: [
        track(11, 1, { access: "blocked" }),
        track(12, 1, { streamable: false }),
        track(13, 1),
      ],
    });

    const data = await (await GET(req("?genre=dub-techno"))).json();
    expect(data.items.map((item: { id: number }) => item.id)).toEqual([13]);
  });

  it("builds a solo queue for an artist id", async () => {
    mockGetTracks.mockResolvedValue({ collection: [track(11, 7), track(12, 7)] });

    const data = await (await GET(req("?artist=7"))).json();
    expect(mockGetTracks).toHaveBeenCalledWith(7, 50);
    expect(data.items).toHaveLength(2);
  });

  it("404s when nothing is playable", async () => {
    mockGetCityDetail.mockReturnValue({ roster: [rosterEntry(1)] });
    mockGetTracks.mockResolvedValue({ collection: [] });
    expect((await GET(req("?city=berlin"))).status).toBe(404);
  });

  it("tolerates per-artist fetch failures", async () => {
    mockGetGenreDetail.mockReturnValue({ roster: [rosterEntry(1), rosterEntry(2)] });
    mockGetTracks
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ collection: [track(21, 2)] });

    const data = await (await GET(req("?genre=dub-techno"))).json();
    expect(data.items.map((item: { id: number }) => item.id)).toEqual([21]);
  });
});
