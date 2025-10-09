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

  it('should handle missing artwork gracefully', () => {
    const playlist = createMockPlaylist({
      artwork_url: undefined,
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    // Should show fallback gradient with icon
    const card = screen.getByText(playlist.title).closest('div');
    expect(card).toBeInTheDocument();
  });

  it('should format duration correctly with hours', () => {
    const playlist = createMockPlaylist({
      duration: 3600000, // 1 hour
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    expect(screen.getByText(/1h 0m/)).toBeInTheDocument();
  });

  it('should format duration correctly with minutes only', () => {
    const playlist = createMockPlaylist({
      duration: 600000, // 10 minutes
    });

    renderWithProviders(<PlaylistCard playlist={playlist} />);

    expect(screen.getByText(/10m/)).toBeInTheDocument();
  });
});

