import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HomeSearch } from "../home-search";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/components/search-dropdown", () => ({
  SearchDropdown: ({ results }: { results: unknown[] }) => (
    <div data-testid="dropdown">{results.length} results</div>
  ),
}));

const BROWSE_INDEX = {
  entries: [
    { kind: "genre", slug: "dub-techno", name: "Dub Techno" },
    { kind: "city", slug: "berlin", name: "Berlin" },
  ],
};

const artist = {
  id: 42,
  permalink: "yagya",
  permalink_url: "https://soundcloud.com/yagya",
  username: "Yagya",
  followers_count: 5000,
  followings_count: 10,
  avatar_url: "https://example.com/a.jpg",
  track_count: 15,
};

function mockFetchResponse(collection: unknown[]) {
  return jest.fn().mockImplementation(async (url: string) => {
    if (url.startsWith("/api/browse/index")) {
      return { ok: true, json: async () => BROWSE_INDEX };
    }
    return { ok: true, json: async () => ({ collection }) };
  });
}

describe("HomeSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pushMock.mockClear();
    window.sessionStorage.clear();
    global.fetch = mockFetchResponse([artist]) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function type(value: string) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  }

  const searchCalls = () =>
    (global.fetch as jest.Mock).mock.calls.filter((call) =>
      String(call[0]).startsWith("/api/search"),
    );

  it("debounces the search request", async () => {
    render(<HomeSearch />);
    type("yag");
    expect(searchCalls()).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/search?q=yag"),
        expect.any(Object),
      ),
    );
  });

  it("opens the dropdown with results and closes on outside click", async () => {
    render(<HomeSearch />);
    type("yag");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(await screen.findByTestId("dropdown")).toHaveTextContent("1 results");

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });

  it("clears results when the query is emptied", async () => {
    render(<HomeSearch />);
    type("yag");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(await screen.findByTestId("dropdown")).toBeInTheDocument();

    type("");
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });

  it("navigates to the selected artist on Enter", async () => {
    render(<HomeSearch />);
    type("yag");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await screen.findByTestId("dropdown");

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/yagya");
  });

  it("shows genre/city quick-jump links matching the query", async () => {
    render(<HomeSearch />);
    type("du");
    await waitFor(() => expect(screen.getByText("Dub Techno")).toBeInTheDocument());
    expect(screen.getByText("Dub Techno").closest("a")).toHaveAttribute(
      "href",
      "/genre/dub-techno",
    );
    expect(screen.queryByText("Berlin")).not.toBeInTheDocument();

    type("berl");
    await waitFor(() => expect(screen.getByText("Berlin")).toBeInTheDocument());
    expect(screen.getByText("Berlin").closest("a")).toHaveAttribute("href", "/city/berlin");
  });

  it("only issues one request for rapid keystrokes", async () => {
    render(<HomeSearch />);
    type("y");
    type("ya");
    type("yag");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    expect(String(searchCalls()[0][0])).toContain("q=yag");
  });
});
