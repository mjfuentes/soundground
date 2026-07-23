import fs from "fs";
import os from "os";
import path from "path";
import { buildSceneFixtureDb, urn } from "@/lib/graph/__tests__/two-scene-fixture";
import { getArtistPresence, getStrongestConnections } from "../artist-context";
import { __resetStoreForTests } from "../store";

describe("artist context", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-artist-ctx-"));
    const dbPath = path.join(dir, "graph.db");
    buildSceneFixtureDb(dbPath).close();
    process.env.GRAPH_DB_PATH = dbPath;
    __resetStoreForTests();
  });

  afterEach(() => {
    __resetStoreForTests();
    delete process.env.GRAPH_DB_PATH;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("lists the artist's circles, sounds, and places as chips", () => {
    const chips = getArtistPresence(urn(1));
    expect(chips).toContainEqual({
      kind: "circle",
      slug: "berlin-dub-techno",
      name: "Berlin Dub Techno",
    });
    expect(chips).toContainEqual({ kind: "sound", slug: "dub-techno", name: "Dub Techno" });
    expect(chips).toContainEqual({ kind: "place", slug: "berlin", name: "Berlin" });
  });

  it("ranks strongest connections by combined edge weight with type context", () => {
    const connections = getStrongestConnections(urn(1), 3);
    // Artist 2 got a weight-3 repost from artist 1 on top of mutual follows.
    expect(connections[0].urn).toBe(urn(2));
    expect(connections[0].context).toBe("follows · reposts");
    expect(connections[0].permalink).toBe("artist-2");
    expect(connections.length).toBe(3);
  });

  it("returns empty for unknown artists", () => {
    expect(getArtistPresence("soundcloud:users:999")).toEqual([]);
    expect(getStrongestConnections("soundcloud:users:999")).toEqual([]);
  });
});
