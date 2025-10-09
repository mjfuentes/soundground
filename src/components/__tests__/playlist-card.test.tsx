/**
 * Tests for PlaylistCard component
 */

import { renderWithProviders, createMockPlaylist, screen } from '@/test-utils';
import { PlaylistCard } from '../playlist-card';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('PlaylistCard', () => {
  it('should render playlist information', () => {
    const playlist = createMockPlaylist({
      title: 'Amazing Playlist',
      track_count: 10,
      duration: 600000, // 10 minutes
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    expect(screen.getByText('Amazing Playlist')).toBeInTheDocument();
    expect(screen.getByText(/10 tracks/)).toBeInTheDocument();
  });

  it('should show stats when showStats is true', () => {
    const playlist = createMockPlaylist({
      likes_count: 500,
      reposts_count: 25,
      playback_count: 5000,
    });

    renderWithProviders(<PlaylistCard playlist={playlist} showStats={true} />);

    expect(screen.getByTitle('Likes')).toBeInTheDocument();
    expect(screen.getByTitle('Reposts')).toBeInTheDocument();
  });

  it('should not show stats when showStats is false', () => {
    const playlist = createMockPlaylist();

    renderWithProviders(<PlaylistCard playlist={playlist} showStats={false} />);

    expect(screen.queryByTitle('Likes')).not.toBeInTheDocument();
  });

  it('should display album badge for albums', () => {
    const album = createMockPlaylist({
      is_album: true,
      title: 'Test Album',
    });

    renderWithProviders(<PlaylistCard playlist={album} />);

    expect(screen.getByText('Album')).toBeInTheDocument();
  });

  it('should display playlist badge for playlists', () => {
    const playlist = createMockPlaylist({
      is_album: false,
      title: 'Test Playlist',
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    expect(screen.getByText('Playlist')).toBeInTheDocument();
  });

  it('should open SoundCloud link when clicked', () => {
    const playlist = createMockPlaylist({
      permalink_url: 'https://soundcloud.com/user/sets/test',
    });

    // Mock window.open
    const mockOpen = jest.fn();
    window.open = mockOpen;

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    const card = screen.getByRole('button');
    card.click();

    expect(mockOpen).toHaveBeenCalledWith('https://soundcloud.com/user/sets/test', '_blank');
  });

  it('should handle missing artwork gracefully', () => {
    const playlist = createMockPlaylist({
      artwork_url: undefined,
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    // Should show fallback icon
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should format duration correctly', () => {
    const playlist = createMockPlaylist({
      duration: 3600000, // 1 hour
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    expect(screen.getByText(/60:00/)).toBeInTheDocument();
  });

  it('should show download link if available', () => {
    const playlist = createMockPlaylist({
      purchase_url: 'https://bandcamp.com/album/test',
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    const link = screen.getByTitle(/Buy on/);
    expect(link).toHaveAttribute('href', 'https://bandcamp.com/album/test');
  });
});

