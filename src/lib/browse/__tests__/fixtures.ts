/**
 * Test fixtures: build an in-memory graph.db with a small known network,
 * run the real aggregation over it, and expose typed sample objects.
 */

import type Database from "better-sqlite3";
import { openGraphDatabase } from "@/lib/graph/database";
import { GraphRepository } from "@/lib/graph/repository";
import { aggregate, type AggregateConfig } from "../aggregate";
import type { CitySummary, GenreSummary, SceneSummary } from "../types";
import type { ResolvedRosterArtist } from "../resolve-artists";

export const FIXTURE_CONFIG: AggregateConfig = {
  minGenreArtists: 2,
  minCityArtists: 2,
  minTagEvidence: 2,
  rosterSize: 12,
};

/**
 * Network: artists 1-3 declare "dub techno" (various spellings), 4 declares
 * "jungle" alone (below threshold). 1 & 2 are in Berlin, 3 in Tokyo, 5 in
 * Berlin without terms. Edges: 1↔2 follow, 1→3 repost, 2→3 follow.
 */
export function buildFixtureGraph(
  uploadIso = "2026-07-21T00:00:00.000Z",
  dbPath = ":memory:",
): Database.Database {
  const db = openGraphDatabase(dbPath);
  const repo = new GraphRepository(db, () => "2026-07-20T00:00:00.000Z");
  const urn = (id: number) => `soundcloud:users:${id}`;

  const artists = [
    { id: 1, city: "Berlin", cc: "DE", tracks: 10, followers: 5000 },
    { id: 2, city: "berlin", cc: "DE", tracks: 20, followers: 2000 },
    { id: 3, city: "Tokyo", cc: "JP", tracks: 5, followers: 100 },
    { id: 4, city: null, cc: null, tracks: 3, followers: 50 },
    { id: 5, city: "Berlin", cc: "DE", tracks: 1, followers: 10 },
  ];
  for (const artist of artists) {
    repo.upsertArtist({
      urn: urn(artist.id),
      permalink: `artist-${artist.id}`,
      cityRaw: artist.city,
      countryCode: artist.cc,
      trackCount: artist.tracks,
      followersCount: artist.followers,
      depth: 0,
    });
  }
  repo.recordLastUpload(urn(1), uploadIso);
  repo.recordEngagement(urn(1), { plays: 15000, likes: 800, comments: 120 });
  repo.recordEngagement(urn(2), { plays: 9000, likes: 300, comments: 40 });

  const terms: [number, string, "genre" | "tag", number][] = [
    [1, "dub techno", "genre", 5],
    [2, "dubtechno", "genre", 3],
    [3, "Dub-Techno".toLowerCase(), "genre", 2],
    [1, "ambient", "genre", 2],
    [2, "ambient", "genre", 1],
    [4, "jungle", "genre", 3],
  ];
  for (const [id, term, kind, evidence] of terms) {
    repo.recordTerm({ artistUrn: urn(id), term, kind, evidence });
  }

  const edges: [number, number, "follow" | "repost", number][] = [
    [1, 2, "follow", 1],
    [2, 1, "follow", 1],
    [1, 3, "repost", 2],
    [2, 3, "follow", 1],
  ];
  for (const [src, dst, type, weight] of edges) {
    repo.recordEdge({ srcUrn: urn(src), dstUrn: urn(dst), type, weight, source: "test" });
  }

  return db;
}

export function buildAggregatedFixture(uploadIso?: string, dbPath?: string): Database.Database {
  const db = buildFixtureGraph(uploadIso, dbPath);
  aggregate(db, FIXTURE_CONFIG, () => "2026-07-21T12:00:00.000Z");
  return db;
}

export const sampleGenre: GenreSummary = {
  slug: "dub-techno",
  name: "Dub Techno",
  artistCount: 3,
  relatedNames: ["Ambient"],
  topCity: "Berlin",
  activity: "active now",
  activeNow: true,
  coverUrns: ["soundcloud:users:1", "soundcloud:users:2", "soundcloud:users:3"],
};

export const sampleCity: CitySummary = {
  slug: "berlin",
  name: "Berlin",
  countryCode: "DE",
  artistCount: 3,
  topGenre: "Dub Techno",
  activity: "2 this week",
  activeNow: false,
  coverUrns: ["soundcloud:users:1", "soundcloud:users:2"],
};

export const sampleScene: SceneSummary = {
  id: 1,
  slug: "berlin-dub-techno",
  name: "Berlin Dub Techno",
  cityName: "Berlin",
  tags: ["Dub Techno", "Deep Techno", "Ambient"],
  memberCount: 5,
  activity: "active now",
  activeNow: true,
  coverUrns: ["soundcloud:users:2", "soundcloud:users:1", "soundcloud:users:3"],
};

export const sampleResolvedArtist: ResolvedRosterArtist = {
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
  displayName: "Artist One",
  avatarUrl: null,
  profileHref: "/artist-1",
};
