import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlayButton } from "../play-button";

const playQueueMock = jest.fn();
jest.mock("@/contexts/player-context", () => ({
  usePlayer: () => ({ playQueue: playQueueMock }),
}));

const items = [{ id: 1, url: "u", title: "t", artist: "a", artistUrl: "au", type: "track" }];

describe("PlayButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items }),
    }) as unknown as typeof fetch;
  });

  it("fetches the genre queue and hands it to the player", async () => {
    render(<PlayButton scope={{ genre: "dub-techno" }} label="Dub Techno" />);
    fireEvent.click(screen.getByRole("button", { name: "Play Dub Techno" }));

    await waitFor(() => expect(playQueueMock).toHaveBeenCalledWith(items, false));
    expect(global.fetch).toHaveBeenCalledWith("/api/browse/queue?genre=dub-techno");
  });

  it("prevents the wrapping link from navigating", async () => {
    render(
      // A plain <a> stands in for any wrapping link; Next's <Link/> is irrelevant here.
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <a href="/genre/dub-techno" data-testid="wrapper">
        <PlayButton scope={{ genre: "dub-techno" }} label="Dub Techno" />
      </a>,
    );
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("button").dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it("requests an artist queue for artist scope", async () => {
    render(<PlayButton scope={{ artist: 42 }} label="Yagya" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/browse/queue?artist=42"));
  });

  it("shows a failure state when the queue is empty", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No playable tracks" }),
    }) as unknown as typeof fetch;

    render(<PlayButton scope={{ city: "berlin" }} label="Berlin" variant="cta" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("✕ Nothing playable")).toBeInTheDocument());
    expect(playQueueMock).not.toHaveBeenCalled();
  });
});
