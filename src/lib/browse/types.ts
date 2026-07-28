/**
 * Browse domain types, backed by the aggregated graph (browse_* tables).
 * Every value is derived from crawl observations — no editorial content.
 */

export interface GenreSummary {
  slug: string;
  name: string;
  artistCount: number;
  /** Label/hub members, counted separately ("+ N labels"). */
  hubCount: number;
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
  /** Full country name ("United States") — the API supplies names, not codes. */
  country: string | null;
  artistCount: number;
  hubCount: number;
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
  /** Labels/radios/promo carrying this sound. */
  hubs: RosterArtist[];
  cities: LinkedCount[];
  related: LinkedCount[];
}

export interface CityDetail extends CitySummary {
  roster: RosterArtist[];
  hubs: RosterArtist[];
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
  /** Crawled artist members only — the honest displayed count. */
  memberCount: number;
  /** Crawled label/hub members, shown alongside ("+ N labels"). */
  hubCount: number;
  activity: string | null;
  activeNow: boolean;
  coverUrns: string[];
}

/**
 * A circle's geographic character (ideas/0005). Circles sit on a spectrum:
 * a few *are* a city (peripheral local scenes), most are placeless global
 * sounds, some are a global sound with a hub center of gravity.
 */
export interface SceneHome {
  /** "A São Paulo scene" | "Centered on Berlin (24% of located members)" | "Global — no single home". */
  label: string;
  /** Home city, when one holds the circle; null when placeless. */
  city: string | null;
  /** Top city's share of located members (0..1); null when placeless. */
  share: number | null;
  kind: "place" | "tinted" | "global";
}

export interface SceneDetail extends SceneSummary {
  /** Ranked by within-scene weighted in-degree. Hubs excluded. */
  roster: RosterArtist[];
  /** Labels/radios/promo channels inside the scene (B4). */
  hubs: RosterArtist[];
  /** Genres this scene's members belong to. */
  genres: LinkedCount[];
  /** Cities this scene's members declare. */
  cities: LinkedCount[];
  /** Geographic character line for the hero (ideas/0005). */
  home: SceneHome;
}

export interface BrowseStatus {
  hasData: boolean;
  aggregatedAt: string | null;
  genreCount: number;
  cityCount: number;
  sceneCount: number;
}
