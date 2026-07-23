import { render, screen } from "@testing-library/react";
import SoundInPlacePage, { generateMetadata } from "../page";
import { sampleResolvedArtist } from "@/lib/browse/__tests__/fixtures";
import type { IntersectionDetail } from "@/lib/browse/store";

jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const detail: IntersectionDetail = {
  genreSlug: "dub-techno",
  genreName: "Dub Techno",
  citySlug: "berlin",
  cityName: "Berlin",
  artistCount: 2,
  roster: [
    {
      urn: "soundcloud:users:1",
      permalink: "artist-1",
      cityRaw: "Berlin",
      connections: 0,
      followers: 5000,
      plays: 15000,
      likes: 800,
      comments: 120,
      trackCount: 10,
      otherGenres: [],
    },
  ],
};

jest.mock("@/lib/browse/store", () => ({
  getSoundInPlace: jest.fn((genre: string, city: string) =>
    genre === "dub-techno" && city === "berlin" ? detail : null,
  ),
}));

jest.mock("@/lib/browse/resolve-artists", () => ({
  resolveRoster: jest.fn(async () => [sampleResolvedArtist]),
}));

const props = (slug: string, place: string) => ({ params: Promise.resolve({ slug, place }) });

describe("SoundInPlacePage", () => {
  it("renders the intersection roster with zoom-out links", async () => {
    render(await SoundInPlacePage(props("dub-techno", "berlin")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dub Techno in Berlin");
    expect(screen.getByText("Sound / Dub Techno / Berlin")).toBeInTheDocument();
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All of Dub Techno/ })).toHaveAttribute(
      "href",
      "/sound/dub-techno",
    );
    expect(screen.getByRole("link", { name: /All of Berlin/ })).toHaveAttribute(
      "href",
      "/place/berlin",
    );
  });

  it("404s on empty intersections", async () => {
    await expect(SoundInPlacePage(props("polka", "berlin"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("titles the page after the intersection", async () => {
    const metadata = await generateMetadata(props("dub-techno", "berlin"));
    expect(metadata.title).toBe("Dub Techno in Berlin — SoundGround");
  });
});
