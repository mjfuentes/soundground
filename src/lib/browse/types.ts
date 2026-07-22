/**
 * Browse domain types, backed by the aggregated graph (browse_* tables).
 * Every value is derived from crawl observations — no editorial content.
 */

export interface GenreSummary {
  slug: string;
  name: string;
  artistCount: number;
  /** Names of the genres this genre's artists most co-occur with. */
  relatedNames: string[];
  topCity: string | null;
  /** Human activity line ("active now", "12 this week") or null to hide. */
  activity: string | null;
  activeNow: boolean;
  /** Top roster artist urns, used to resolve card cover images. */
  coverUrns: string[];
}

export interface CitySummary {
  slug: string;
  name: string;
  countryCode: string | null;
  artistCount: number;
  topGenre: string | null;
  activity: string | null;
  activeNow: boolean;
  coverUrns: string[];
}

export interface RosterArtist {
  urn: string;
  permalink: string | null;
  cityRaw: string | null;
  connections: number;
  followers: number;
  plays: number;
  likes: number;
  comments: number;
  trackCount: number | null;
  otherGenres: string[];
}

export interface LinkedCount {
  slug: string;
  name: string;
  count: number;
}

export interface GenreDetail extends GenreSummary {
  roster: RosterArtist[];
  cities: LinkedCount[];
  related: LinkedCount[];
}

export interface CityDetail extends CitySummary {
  roster: RosterArtist[];
  genres: LinkedCount[];
  otherCities: LinkedCount[];
}

export interface SceneSummary {
  id: number;
  slug: string;
  name: string;
  /** Dominant city, when one holds the scene ("Berlin"). */
  cityName: string | null;
  /** Top scene vocabulary (display names), most defining first. */
  tags: string[];
  /** Crawled members only — the honest displayed count. */
  memberCount: number;
  activity: string | null;
  activeNow: boolean;
  coverUrns: string[];
}

export interface SceneDetail extends SceneSummary {
  /** Ranked by within-scene weighted in-degree. */
  roster: RosterArtist[];
  /** Genres this scene's members belong to. */
  genres: LinkedCount[];
  /** Cities this scene's members declare. */
  cities: LinkedCount[];
}

export interface BrowseStatus {
  hasData: boolean;
  aggregatedAt: string | null;
  genreCount: number;
  cityCount: number;
  sceneCount: number;
}
