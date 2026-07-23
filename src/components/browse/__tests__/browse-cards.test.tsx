import { render, screen } from "@testing-library/react";
import { ArtistRow } from "../artist-row";
import { BrowseHeader } from "../browse-header";
import { CityCard } from "../city-card";
import { GenreCard } from "../genre-card";
import { SceneCard } from "../scene-card";
import {
  sampleCity,
  sampleGenre,
  sampleResolvedArtist,
  sampleScene,
} from "@/lib/browse/__tests__/fixtures";

jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: jest.fn() }),
}));

describe("GenreCard", () => {
  it("links to the genre page", () => {
    render(<GenreCard genre={sampleGenre} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/sound/dub-techno");
  });

  it("shows name, related genres, artist count, activity, and top city", () => {
    render(<GenreCard genre={sampleGenre} />);
    expect(screen.getByText("Dub Techno")).toBeInTheDocument();
    expect(screen.getByText("with Ambient")).toBeInTheDocument();
    expect(screen.getByText("3 artists")).toBeInTheDocument();
    expect(screen.getByText("active now")).toBeInTheDocument();
    expect(screen.getByText("↳ strongest in Berlin")).toBeInTheDocument();
  });

  it("hides activity and top city when absent", () => {
    render(
      <GenreCard genre={{ ...sampleGenre, activity: null, activeNow: false, topCity: null }} />,
    );
    expect(screen.queryByText("active now")).not.toBeInTheDocument();
    expect(screen.queryByText(/strongest in/)).not.toBeInTheDocument();
  });
});

describe("SceneCard", () => {
  it("links to the scene page and shows the scene's own vocabulary", () => {
    render(<SceneCard scene={sampleScene} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/circle/berlin-dub-techno");
    expect(screen.getByText("Berlin Dub Techno")).toBeInTheDocument();
    expect(screen.getByText("Dub Techno · Deep Techno · Ambient")).toBeInTheDocument();
    expect(screen.getByText("5 artists + 1 label")).toBeInTheDocument();
    expect(screen.getByText("active now")).toBeInTheDocument();
    expect(screen.getByText("↳ centered in Berlin")).toBeInTheDocument();
  });

  it("hides the city line and activity when absent", () => {
    render(
      <SceneCard scene={{ ...sampleScene, cityName: null, activity: null, activeNow: false }} />,
    );
    expect(screen.queryByText(/centered in/)).not.toBeInTheDocument();
    expect(screen.queryByText("active now")).not.toBeInTheDocument();
  });
});

describe("CityCard", () => {
  it("links to the city page and shows derived fields", () => {
    render(<CityCard city={sampleCity} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/place/berlin");
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getByText("DE · 3 artists")).toBeInTheDocument();
    expect(screen.getByText("↳ Dub Techno is strongest here")).toBeInTheDocument();
  });
});

describe("ArtistRow", () => {
  it("shows rank, resolved name, context, and reach metrics, linking to the profile", () => {
    render(<ArtistRow rank={1} artist={sampleResolvedArtist} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Berlin · also in Ambient")).toBeInTheDocument();
    expect(screen.getByText("2.3k")).toBeInTheDocument();
    expect(screen.getByText("followers")).toBeInTheDocument();
    expect(screen.getByText("15k")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/artist-1");
  });

  it("renders without a link when no permalink is known", () => {
    render(<ArtistRow rank={2} artist={{ ...sampleResolvedArtist, profileHref: null }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("falls back to connections when reach is unknown", () => {
    render(<ArtistRow rank={3} artist={{ ...sampleResolvedArtist, followers: 0 }} />);
    expect(screen.queryByText("followers")).not.toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("connections")).toBeInTheDocument();
  });

  it("shows nothing when neither reach nor connections are known", () => {
    render(
      <ArtistRow
        rank={4}
        artist={{ ...sampleResolvedArtist, followers: 0, connections: 0 }}
      />,
    );
    expect(screen.queryByText("followers")).not.toBeInTheDocument();
    expect(screen.queryByText("connections")).not.toBeInTheDocument();
  });
});

describe("BrowseHeader", () => {
  it("renders the wordmark and a single Browse nav item with a counts line", () => {
    render(<BrowseHeader countsLine="19 genres · 3 cities" />);
    expect(screen.getByText("SOUNDGROUND")).toHaveAttribute("href", "/");
    expect(screen.getByText("Browse")).toHaveAttribute("href", "/");
    expect(screen.getByText("19 genres · 3 cities")).toBeInTheDocument();
  });

  it("swaps nav for a breadcrumb on detail pages", () => {
    render(<BrowseHeader breadcrumb="Genre / Dub Techno" />);
    expect(screen.getByText("Genre / Dub Techno")).toBeInTheDocument();
    expect(screen.queryByText("Browse")).not.toBeInTheDocument();
  });
});
