import { render, screen } from "@testing-library/react";
import GenrePage, { generateMetadata, generateStaticParams } from "../page";
import { sampleGenre, sampleResolvedArtist } from "@/lib/browse/__tests__/fixtures";
import type { GenreDetail } from "@/lib/browse/types";

jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const detail: GenreDetail = {
  ...sampleGenre,
  roster: [
    {
      urn: "soundcloud:users:1",
      permalink: "artist-1",
      cityRaw: "Berlin",
      connections: 4,
      followers: 2300,
      plays: 15000,
      likes: 800,
      comments: 120,
      trackCount: 10,
      otherGenres: ["Ambient"],
    },
  ],
  cities: [{ slug: "berlin", name: "Berlin", count: 2 }],
  related: [{ slug: "ambient", name: "Ambient", count: 2 }],
};

jest.mock("@/lib/browse/store", () => ({
  getGenreDetail: jest.fn((slug: string) => (slug === "dub-techno" ? detail : null)),
  listGenres: jest.fn(() => [{ slug: "dub-techno" }]),
}));

jest.mock("@/lib/browse/resolve-artists", () => ({
  resolveRoster: jest.fn(async () => [sampleResolvedArtist]),
}));

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("GenrePage", () => {
  it("renders real aggregated detail with a resolved roster", async () => {
    render(await GenrePage(props("dub-techno")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dub Techno");
    expect(screen.getByText("Genre / Dub Techno")).toBeInTheDocument();
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Dub Techno in Berlin")).toBeInTheDocument();
    expect(screen.getByText("Ambient")).toBeInTheDocument();
  });

  it("404s on unknown slugs", async () => {
    await expect(GenrePage(props("polka"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("generates metadata from the aggregated genre", async () => {
    const metadata = await generateMetadata(props("dub-techno"));
    expect(metadata.title).toBe("Dub Techno — SoundGround");
  });

  it("statically generates every aggregated genre", () => {
    expect(generateStaticParams()).toEqual([{ slug: "dub-techno" }]);
  });
});
