/**
 * OFFICIAL SoundCloud API client (api.soundcloud.com).
 *
 * This is the PRIMARY data source. Authenticates via the client-credentials
 * flow (see client-credentials.ts) using the registered app's credentials.
 * Spec: https://raw.githubusercontent.com/soundcloud/api/master/openapi/api.yaml
 *
 * The official API identifies resources by URN (e.g. "soundcloud:tracks:123")
 * rather than numeric id. URNs embed the same numeric ids the rest of the app
 * uses, so responses are mapped back to the api-v2-era shapes defined in
 * ./client.ts and no UI code needs to change.
 *
 * Not available here (api-v2 only): user spotlight, track transcodings.
 * The smart-client facade handles those gaps.
 */

import got from "got";
import { getClientCredentialsToken } from "./client-credentials";
import { OFFICIAL_API_BASE } from "./config";
import type {
  SoundCloudFollower,
  SoundCloudPlaylist,
  SoundCloudSearchResult,
  SoundCloudTrack,
  SoundCloudUser,
  SpotlightItem,
} from "./client";

// ---------------------------------------------------------------------------
// URN helpers
// ---------------------------------------------------------------------------

/** Extract the numeric id from a URN like "soundcloud:tracks:123". */
export function urnToId(urn: string | undefined): number {
  if (!urn) return 0;
  const numeric = Number.parseInt(urn.split(":").pop() ?? "", 10);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export function userUrn(userId: number): string {
  return `soundcloud:users:${userId}`;
}

export function trackUrn(trackId: number): string {
  return `soundcloud:tracks:${trackId}`;
}

export function playlistUrn(playlistId: number): string {
  return `soundcloud:playlists:${playlistId}`;
}

// ---------------------------------------------------------------------------
// Raw response shapes (subset of the official spec we consume).
// Everything fetched from the network is treated as untrusted input:
// mappers only copy known fields and normalize identifiers.
// ---------------------------------------------------------------------------

interface RawUser {
  id?: number;
  urn?: string;
  permalink?: string;
  permalink_url?: string;
  username?: string;
  avatar_url?: string;
  description?: string;
  city?: string;
  country?: string;
  full_name?: string;
  followers_count?: number;
  followings_count?: number;
  track_count?: number;
  playlist_count?: number;
  public_favorites_count?: number;
  reposts_count?: number;
  comments_count?: number;
}

interface RawTrack {
  id?: number;
  urn?: string;
  title?: string;
  permalink_url?: string;
  artwork_url?: string;
  duration?: number;
  playback_count?: number;
  favoritings_count?: number;
  reposts_count?: number;
  comment_count?: number;
  description?: string;
  genre?: string;
  tag_list?: string;
  created_at?: string;
  streamable?: boolean;
  access?: "playable" | "preview" | "blocked";
  purchase_url?: string;
  download_url?: string;
  user?: RawUser;
}

interface RawPlaylist {
  id?: number;
  urn?: string;
  title?: string;
  permalink_url?: string;
  artwork_url?: string;
  description?: string;
  duration?: number;
  track_count?: number;
  likes_count?: number;
  playback_count?: number;
  playlist_type?: string;
  created_at?: string;
  purchase_url?: string;
  tracks?: RawTrack[];
  user?: RawUser;
}

interface Collection<T> {
  collection?: T[];
  next_href?: string;
}

export interface TrackStreams {
  hls_aac_160_url?: string;
  http_mp3_128_url?: string;
  hls_mp3_128_url?: string;
  preview_mp3_128_url?: string;
}

// ---------------------------------------------------------------------------
// Mappers: official shapes -> app shapes (defined in ./client.ts)
// ---------------------------------------------------------------------------

const ALBUM_PLAYLIST_TYPES = new Set(["album", "ep", "compilation", "single"]);

function mapUser(raw: RawUser): SoundCloudUser {
  return {
    id: raw.id ?? urnToId(raw.urn),
    permalink: raw.permalink ?? "",
    username: raw.username ?? "",
    avatar_url: raw.avatar_url,
    permalink_url: raw.permalink_url ?? "",
    description: raw.description,
    followers_count: raw.followers_count ?? 0,
    followings_count: raw.followings_count ?? 0,
    track_count: raw.track_count ?? 0,
    playlist_count: raw.playlist_count ?? 0,
    // The official API does not expose verification status.
    verified: false,
    city: raw.city,
    country_code: raw.country,
    full_name: raw.full_name,
    public_favorites_count: raw.public_favorites_count,
    reposts_count: raw.reposts_count,
    comments_count: raw.comments_count,
    visuals: null,
  };
}

function mapEmbeddedUser(raw: RawUser | undefined): SoundCloudTrack["user"] {
  return {
    id: raw?.id ?? urnToId(raw?.urn),
    username: raw?.username ?? "",
    permalink_url: raw?.permalink_url ?? "",
    avatar_url: raw?.avatar_url,
  };
}

function mapTrack(raw: RawTrack): SoundCloudTrack {
  return {
    id: raw.id ?? urnToId(raw.urn),
    title: raw.title ?? "",
    permalink_url: raw.permalink_url ?? "",
    artwork_url: raw.artwork_url,
    duration: raw.duration ?? 0,
    playback_count: raw.playback_count,
    likes_count: raw.favoritings_count,
    reposts_count: raw.reposts_count,
    comment_count: raw.comment_count,
    description: raw.description,
    genre: raw.genre,
    tag_list: raw.tag_list,
    created_at: raw.created_at,
    streamable: raw.streamable,
    access: raw.access,
    purchase_url: raw.purchase_url,
    download_url: raw.download_url ?? undefined,
    user: mapEmbeddedUser(raw.user),
  };
}

function mapPlaylist(raw: RawPlaylist): SoundCloudPlaylist {
  // The live API returns playlist_type in UPPERCASE ("PLAYLIST", "ALBUM", ...);
  // normalize to the lowercase api-v2-era convention the UI expects.
  const playlistType = raw.playlist_type?.toLowerCase();
  return {
    id: raw.id ?? urnToId(raw.urn),
    title: raw.title ?? "",
    permalink_url: raw.permalink_url ?? "",
    artwork_url: raw.artwork_url,
    description: raw.description,
    duration: raw.duration ?? 0,
    track_count: raw.track_count ?? 0,
    likes_count: raw.likes_count,
    playback_count: raw.playback_count,
    is_album: ALBUM_PLAYLIST_TYPES.has(playlistType ?? ""),
    set_type: playlistType,
    created_at: raw.created_at,
    purchase_url: raw.purchase_url,
    tracks: raw.tracks?.map(mapTrack),
    user: mapEmbeddedUser(raw.user),
  };
}

function mapFollower(raw: RawUser): SoundCloudFollower {
  return {
    id: raw.id ?? urnToId(raw.urn),
    permalink: raw.permalink ?? "",
    username: raw.username ?? "",
    avatar_url: raw.avatar_url,
    followers_count: raw.followers_count ?? 0,
    track_count: raw.track_count,
  };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function apiGet<T>(
  endpoint: string,
  searchParams: Record<string, string | number | boolean> = {}
): Promise<T> {
  const token = await getClientCredentialsToken();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${OFFICIAL_API_BASE}${endpoint}`;

  const text = await got(url, {
    searchParams,
    headers: { Authorization: `OAuth ${token}` },
  }).text();

  return JSON.parse(text) as T;
}

/** Normalize both envelope styles ({collection} vs bare array). */
function asCollection<T>(data: Collection<T> | T[]): Collection<T> {
  if (Array.isArray(data)) {
    return { collection: data };
  }
  return data;
}

// ---------------------------------------------------------------------------
// Public interface (mirrors ./client.ts)
// ---------------------------------------------------------------------------

export async function resolveProfile(url: string): Promise<SoundCloudUser> {
  const raw = await apiGet<RawUser>("/resolve", { url });
  return mapUser(raw);
}

/**
 * The official API has no spotlight endpoint; the facade falls back to
 * api-v2 when that is configured, or an empty collection otherwise.
 */
export async function getSpotlight(): Promise<{ collection: SpotlightItem[] }> {
  return { collection: [] };
}

async function getUserPlaylists(userId: number, limit: number): Promise<SoundCloudPlaylist[]> {
  const data = asCollection(
    await apiGet<Collection<RawPlaylist> | RawPlaylist[]>(
      `/users/${userUrn(userId)}/playlists`,
      { limit, linked_partitioning: true }
    )
  );
  return (data.collection ?? []).map(mapPlaylist);
}

export async function getPlaylists(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  const playlists = await getUserPlaylists(userId, limit);
  // api-v2 parity: "playlists" excludes album-type sets.
  return { collection: playlists.filter((p) => !p.is_album) };
}

export async function getAlbums(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudPlaylist[] }> {
  const playlists = await getUserPlaylists(userId, limit);
  return { collection: playlists.filter((p) => p.is_album) };
}

export async function getTracks(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  const data = asCollection(
    await apiGet<Collection<RawTrack> | RawTrack[]>(
      `/users/${userUrn(userId)}/tracks`,
      { limit, linked_partitioning: true }
    )
  );
  return { collection: (data.collection ?? []).map(mapTrack) };
}

export async function getReposts(
  userId: number,
  limit = 200
): Promise<{ collection: SoundCloudTrack[] }> {
  const data = asCollection(
    await apiGet<Collection<RawTrack> | RawTrack[]>(
      `/users/${userUrn(userId)}/reposts/tracks`,
      { limit, linked_partitioning: true }
    )
  );
  return { collection: (data.collection ?? []).map(mapTrack) };
}

export async function getTrack(trackId: number): Promise<SoundCloudTrack | null> {
  try {
    const raw = await apiGet<RawTrack>(`/tracks/${trackUrn(trackId)}`);
    return mapTrack(raw);
  } catch (error) {
    console.error(`[official] Error fetching track ${trackId}:`, error);
    return null;
  }
}

/**
 * Streamable URLs for a track. Official replacement for api-v2's
 * media.transcodings dance — returns direct mp3/HLS URLs.
 */
export async function getTrackStreams(trackId: number): Promise<TrackStreams> {
  return apiGet<TrackStreams>(`/tracks/${trackUrn(trackId)}/streams`);
}

async function getFollowCollection(
  endpoint: string,
  limit: number,
  nextHref?: string
): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  const data = asCollection(
    nextHref
      ? await apiGet<Collection<RawUser> | RawUser[]>(nextHref)
      : await apiGet<Collection<RawUser> | RawUser[]>(endpoint, {
          limit,
          linked_partitioning: true,
        })
  );
  return {
    collection: (data.collection ?? []).map(mapFollower),
    next_href: data.next_href,
  };
}

export async function getFollowers(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  return getFollowCollection(`/users/${userUrn(userId)}/followers`, limit, nextHref);
}

export async function getFollowings(
  userId: number,
  limit = 200,
  nextHref?: string
): Promise<{ collection: SoundCloudFollower[]; next_href?: string }> {
  return getFollowCollection(`/users/${userUrn(userId)}/followings`, limit, nextHref);
}

export async function getPlaylistWithTracks(
  playlistId: number
): Promise<SoundCloudPlaylist> {
  const raw = await apiGet<RawPlaylist>(`/playlists/${playlistUrn(playlistId)}`);
  const playlist = mapPlaylist(raw);

  if (!playlist.tracks || playlist.tracks.length === 0) {
    const tracks = asCollection(
      await apiGet<Collection<RawTrack> | RawTrack[]>(
        `/playlists/${playlistUrn(playlistId)}/tracks`,
        { linked_partitioning: true }
      )
    );
    return { ...playlist, tracks: (tracks.collection ?? []).map(mapTrack) };
  }

  return playlist;
}

/**
 * Search. The official API has no unified /search endpoint — it exposes
 * per-resource queries (/tracks?q=, /users?q=, /playlists?q=). A filtered
 * search maps to one query; an unfiltered one fans out and concatenates.
 */
export async function search(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    filter?: "tracks" | "users" | "playlists" | "albums";
  } = {}
): Promise<SoundCloudSearchResult> {
  const { limit = 20, offset = 0, filter } = options;
  const params = { q: query, limit, offset, linked_partitioning: true };

  const searchTracks = async () =>
    (asCollection(
      await apiGet<Collection<RawTrack> | RawTrack[]>("/tracks", params)
    ).collection ?? []).map(mapTrack);

  const searchUsers = async () =>
    (asCollection(
      await apiGet<Collection<RawUser> | RawUser[]>("/users", params)
    ).collection ?? []).map(mapUser);

  const searchPlaylists = async () =>
    (asCollection(
      await apiGet<Collection<RawPlaylist> | RawPlaylist[]>("/playlists", params)
    ).collection ?? []).map(mapPlaylist);

  if (filter === "tracks") {
    const tracks = await searchTracks();
    return { collection: tracks, total_results: tracks.length };
  }
  if (filter === "users") {
    const users = await searchUsers();
    return { collection: users, total_results: users.length };
  }
  if (filter === "playlists" || filter === "albums") {
    const playlists = await searchPlaylists();
    const filtered =
      filter === "albums" ? playlists.filter((p) => p.is_album) : playlists;
    return { collection: filtered, total_results: filtered.length };
  }

  const [users, tracks, playlists] = await Promise.all([
    searchUsers(),
    searchTracks(),
    searchPlaylists(),
  ]);
  const collection = [...users, ...tracks, ...playlists];
  return { collection, total_results: collection.length };
}
