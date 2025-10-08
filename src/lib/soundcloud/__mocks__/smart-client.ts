// Mock implementation of smart-client for tests
export const resolveProfile = jest.fn();
export const getSpotlight = jest.fn();
export const getPlaylists = jest.fn();
export const getAlbums = jest.fn();
export const getTracks = jest.fn();
export const getReposts = jest.fn();
export const getFollowers = jest.fn();
export const getFollowings = jest.fn();
export const getPlaylistWithTracks = jest.fn();

// Re-export types (these are just for TypeScript, no runtime impact)
export type {
  SoundCloudUser,
  SoundCloudTrack,
  SoundCloudPlaylist,
  SoundCloudFollower,
  SpotlightItem,
} from '../client';

export { isPlaylist } from '../client';

