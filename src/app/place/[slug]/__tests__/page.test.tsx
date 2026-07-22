import { render, screen } from "@testing-library/react";
import CityPage, { generateMetadata, generateStaticParams } from "../page";
import { sampleCity, sampleResolvedArtist } from "@/lib/browse/__tests__/fixtures";
import type { CityDetail } from "@/lib/browse/types";

jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const detail: CityDetail = {
  ...sampleCity,
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
  genres: [{ slug: "dub-techno", name: "Dub Techno", count: 2 }],
  otherCities: [{ slug: "tokyo", name: "Tokyo", count: 2 }],
};

jest.mock("@/lib/browse/store", () => ({
  getCityDetail: jest.fn((slug: string) => (slug === "berlin" ? detail : null)),
  listCities: jest.fn(() => [{ slug: "berlin" }]),
}));

jest.mock("@/lib/browse/resolve-artists", () => ({
  resolveRoster: jest.fn(async () => [sampleResolvedArtist]),
}));

const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("CityPage", () => {
  it("renders real aggregated detail with a resolved roster", async () => {
    render(await CityPage(props("berlin")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Berlin");
    expect(screen.getByText("Place / Berlin")).toBeInTheDocument();
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Dub Techno")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
  });

  it("404s on unknown slugs", async () => {
    await expect(CityPage(props("atlantis"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("generates metadata from the aggregated city", async () => {
    const metadata = await generateMetadata(props("berlin"));
    expect(metadata.title).toBe("Berlin — SoundGround");
  });

  it("statically generates every aggregated city", () => {
    expect(generateStaticParams()).toEqual([{ slug: "berlin" }]);
  });
});
