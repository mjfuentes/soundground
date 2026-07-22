import { resolveAvatarMap } from "../resolve-artists";

const mockPeekUser = jest.fn();
const mockGetUser = jest.fn();
jest.mock("@/lib/soundcloud/official-cached-client", () => ({
  peekUser: (...args: unknown[]) => mockPeekUser(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  seedUserCache: jest.fn(),
}));

const urn = (id: number) => `soundcloud:users:${id}`;
const user = (id: number) => ({ id, avatar_url: `https://img/${id}.jpg` });

describe("resolveAvatarMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPeekUser.mockReturnValue(null);
    mockGetUser.mockImplementation(async (id: number) => user(id));
  });

  it("serves cached avatars without touching the API", async () => {
    mockPeekUser.mockImplementation((id: number) => user(id));
    const avatars = await resolveAvatarMap([[urn(1), urn(2)]]);
    expect(avatars.get(urn(1))).toBe("https://img/1.jpg");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("spends the API budget round-robin across cards, not card by card", async () => {
    await resolveAvatarMap([
      [urn(1), urn(2)],
      [urn(3), urn(4)],
    ]);
    // First round: the top member of EVERY card before anyone's second.
    expect(mockGetUser.mock.calls.slice(0, 2).map(([id]) => id)).toEqual([1, 3]);
  });

  it("mixes cached and fetched avatars, deduping across cards", async () => {
    mockPeekUser.mockImplementation((id: number) => (id === 1 ? user(1) : null));
    const avatars = await resolveAvatarMap([
      [urn(1), urn(2)],
      [urn(2), urn(1)],
    ]);
    expect(avatars.get(urn(1))).toBe("https://img/1.jpg");
    expect(avatars.get(urn(2))).toBe("https://img/2.jpg");
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it("returns null for urns that fail to resolve", async () => {
    mockGetUser.mockRejectedValue(new Error("nope"));
    const avatars = await resolveAvatarMap([[urn(9)]]);
    expect(avatars.get(urn(9))).toBeNull();
  });
});
