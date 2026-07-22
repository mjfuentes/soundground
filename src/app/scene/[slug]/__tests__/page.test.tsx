import { render, screen } from "@testing-library/react";
import ScenePage, { generateMetadata, generateStaticParams } from "../page";
import { sampleResolvedArtist, sampleScene } from "@/lib/browse/__tests__/fixtures";
import type { SceneDetail } from "@/lib/browse/types";

jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const detail: SceneDetail = {
  ...sampleScene,
  roster: [
    {
      urn: "soundcloud:users:2",
      permalink: "artist-2",
      cityRaw: "Berlin",
      connections: 12,
      followers: 100,
      plays: 9000,
      likes: 300,
      comments: 40,
      trackCount: 20,
      otherGenres: ["Dub Techno"],
    },
  ],
  hubs: [
    {
      urn: "soundcloud:users:23",
      permalink: "dub-radio",
      cityRaw: "Berlin",
      connections: 9,
      followers: 40000,
      plays: 0,
      likes: 0,
      comments: 0,
      trackCount: 2000,
      otherGenres: [],
    },
  ],
  genres: [{ slug: "dub-techno", name: "Dub Techno", count: 5 }],
  cities: [{ slug: "berlin", name: "Berlin", count: 4 }],
};

jest.mock("@/lib/browse/scene-store", () => ({
  getSceneDetail: jest.fn((slug: string) => (slug === "berlin-dub-techno" ? detail : null)),
  listScenes: jest.fn(() => [{ slug: "berlin-dub-techno" }]),
}));

jest.mock("@/lib/browse/resolve-artists", () => ({
  resolveRoster: jest.fn(async (roster: { urn: string }[]) =>
    roster.map((artist) =>
      artist.urn === "soundcloud:users:23"
        ? { ...detail.hubs[0], displayName: "Dub Radio", avatarUrl: null, profileHref: "/dub-radio" }
        : sampleResolvedArtist,
    ),
  ),
}));

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("ScenePage", () => {
  it("renders the detected scene with its ranked roster and links", async () => {
    render(await ScenePage(props("berlin-dub-techno")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Berlin Dub Techno");
    expect(screen.getByText("Scene / Berlin Dub Techno")).toBeInTheDocument();
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText(/5 artists mapped/)).toBeInTheDocument();
    expect(screen.getByText(/centered in Berlin/)).toBeInTheDocument();
    // Tags that exist as genre pages become links; others stay plain chips.
    expect(screen.getByRole("link", { name: "Dub Techno" })).toHaveAttribute(
      "href",
      "/genre/dub-techno",
    );
    expect(screen.getByText("Ambient")).not.toHaveAttribute("href");
  });

  it("lists the scene's hubs separately from the artist roster", async () => {
    render(await ScenePage(props("berlin-dub-techno")));
    expect(screen.getByText("Hubs & labels")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dub Radio/ })).toHaveAttribute("href", "/dub-radio");
  });

  it("404s on unknown slugs", async () => {
    await expect(ScenePage(props("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("generates metadata from the scene", async () => {
    const metadata = await generateMetadata(props("berlin-dub-techno"));
    expect(metadata.title).toBe("Berlin Dub Techno — SoundGround");
  });

  it("statically generates every named scene", () => {
    expect(generateStaticParams()).toEqual([{ slug: "berlin-dub-techno" }]);
  });
});
