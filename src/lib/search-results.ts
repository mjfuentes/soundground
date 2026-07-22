/**
 * Shared type guards, quality filtering, and ranking for search results.
 * Extracted from the home page so any search surface ranks results the
 * same way the dropdown renders them.
 */

import type { SoundCloudUser, SoundCloudTrack, SoundCloudPlaylist } from "@/lib/soundcloud/client";

export type SearchResult = SoundCloudUser | SoundCloudTrack | SoundCloudPlaylist;

export function isUser(result: SearchResult): result is SoundCloudUser {
  return "followers_count" in result && "followings_count" in result;
}

export function isTrack(result: SearchResult): result is SoundCloudTrack {
  return "user" in result && !("is_album" in result);
}

export function isPlaylist(result: SearchResult): result is SoundCloudPlaylist {
  return "is_album" in result;
}

function hasImage(result: SearchResult): boolean {
  if (isUser(result)) {
    return !!result.avatar_url;
  }
  return !!result.artwork_url;
}

export function isQualityResult(result: SearchResult): boolean {
  if (isUser(result)) {
    const hasAvatar = !!result.avatar_url;
    const hasMinFollowers = (result.followers_count || 0) >= 10;
    const hasTracks = (result.track_count || 0) >= 1;

    if (!hasAvatar && !hasTracks && (result.followers_count || 0) < 10) {
      return false;
    }

    return hasAvatar || hasMinFollowers || hasTracks;
  }

  if (isTrack(result)) {
    const hasArtwork = !!result.artwork_url;
    const hasSignificantPlays = (result.playback_count || 0) >= 1000;

    return hasArtwork || hasSignificantPlays;
  }

  if (isPlaylist(result)) {
    const hasArtwork = !!result.artwork_url;
    const hasMinTracks = (result.track_count || 0) >= 3;

    return hasArtwork || hasMinTracks;
  }

  return true;
}

export function sortSearchResults(results: readonly SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    const aIsUser = isUser(a);
    const bIsUser = isUser(b);
    if (aIsUser && !bIsUser) return -1;
    if (!aIsUser && bIsUser) return 1;

    const aHasImage = hasImage(a);
    const bHasImage = hasImage(b);
    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;

    if (isUser(a) && isUser(b)) {
      return (b.followers_count || 0) - (a.followers_count || 0);
    }
    if (isTrack(a) && isTrack(b)) {
      return (b.playback_count || 0) - (a.playback_count || 0);
    }
    if (isPlaylist(a) && isPlaylist(b)) {
      return (b.likes_count || 0) - (a.likes_count || 0);
    }

    const aIsTrack = isTrack(a);
    const bIsTrack = isTrack(b);
    if (aIsTrack && !bIsTrack) return -1;
    if (!aIsTrack && bIsTrack) return 1;

    return 0;
  });
}
