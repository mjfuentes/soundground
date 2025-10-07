import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpotlightPlaylist } from '../spotlight-playlist';
import * as cachedClient from '@/lib/soundcloud/cached-client';
import type { SoundCloudPlaylist } from '@/lib/soundcloud/client';

// Mock the cached client
jest.mock('@/lib/soundcloud/cached-client');

const mockPlaylist: SoundCloudPlaylist = {
  id: 123,
  title: 'Test Playlist',
  permalink_url: 'https://soundcloud.com/user/playlist',
  duration: 180000,
  track_count: 3,
  likes_count: 100,
  reposts_count: 50,
  playback_count: 1000,
  is_album: false,
  user: {
    id: 1,
    username: 'testuser',
    permalink_url: 'https://soundcloud.com/testuser',
  },
};

const mockPlaylistWithTracks: SoundCloudPlaylist = {
  ...mockPlaylist,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      permalink_url: 'https://soundcloud.com/user/track1',
      duration: 60000,
      playback_count: 500,
      likes_count: 50,
      user: {
        id: 1,
        username: 'testuser',
        permalink_url: 'https://soundcloud.com/testuser',
      },
    },
    {
      id: 2,
      title: 'Track 2',
      permalink_url: 'https://soundcloud.com/user/track2',
      duration: 60000,
      playback_count: 300,
      likes_count: 30,
      user: {
        id: 1,
        username: 'testuser',
        permalink_url: 'https://soundcloud.com/testuser',
      },
    },
  ],
};

describe('SpotlightPlaylist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render playlist card', async () => {
    jest.spyOn(cachedClient, 'getPlaylistWithTracks').mockResolvedValue(mockPlaylistWithTracks);

    render(await SpotlightPlaylist({ playlist: mockPlaylist }));
    
    expect(await screen.findByText('Test Playlist')).toBeDefined();
  });

  it('should render playlist tracks when available', async () => {
    jest.spyOn(cachedClient, 'getPlaylistWithTracks').mockResolvedValue(mockPlaylistWithTracks);

    render(await SpotlightPlaylist({ playlist: mockPlaylist }));
    
    expect(await screen.findByText('Track 1')).toBeDefined();
    expect(await screen.findByText('Track 2')).toBeDefined();
  });

  it('should handle errors gracefully when fetching tracks fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(cachedClient, 'getPlaylistWithTracks').mockRejectedValue(new Error('API Error'));

    render(await SpotlightPlaylist({ playlist: mockPlaylist }));
    
    // Playlist card should still render
    expect(await screen.findByText('Test Playlist')).toBeDefined();
    
    // Tracks should not be rendered
    expect(screen.queryByText('Track 1')).toBeNull();
    
    // Error should be logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('should not render tracks section when playlist has no tracks', async () => {
    jest.spyOn(cachedClient, 'getPlaylistWithTracks').mockResolvedValue(mockPlaylist);

    const { container } = render(await SpotlightPlaylist({ playlist: mockPlaylist }));
    
    // Playlist card should render
    expect(await screen.findByText('Test Playlist')).toBeDefined();
    
    // Tracks section should not exist
    const tracksSection = container.querySelector('.border-l-2');
    expect(tracksSection).toBeNull();
  });
});

