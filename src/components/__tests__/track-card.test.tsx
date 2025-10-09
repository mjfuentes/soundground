/**
 * Tests for TrackCard component
 */

import { renderWithProviders, createMockTrack, screen, userEvent } from '@/test-utils';
import { TrackCard } from '../track-card';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('TrackCard', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should render track information', () => {
    const track = createMockTrack({
      title: 'Amazing Track',
      duration: 180000, // 3 minutes
      genre: 'Electronic',
    });

    renderWithProviders(<TrackCard track={track} />);

    expect(screen.getByText('Amazing Track')).toBeInTheDocument();
    expect(screen.getByText(/3:00/)).toBeInTheDocument();
    expect(screen.getByText(/Electronic/)).toBeInTheDocument();
  });

  it('should show stats when showStats is true', () => {
    const track = createMockTrack({
      likes_count: 1000,
      reposts_count: 50,
      comment_count: 25,
    });

    renderWithProviders(<TrackCard track={track} showStats={true} />);

    expect(screen.getByTitle('Likes')).toBeInTheDocument();
    expect(screen.getByTitle('Reposts')).toBeInTheDocument();
    expect(screen.getByTitle('Comments')).toBeInTheDocument();
  });

  it('should not show stats when showStats is false', () => {
    const track = createMockTrack();

    renderWithProviders(<TrackCard track={track} showStats={false} />);

    expect(screen.queryByTitle('Likes')).not.toBeInTheDocument();
  });

  it('should navigate to track page when clicked', async () => {
    const track = createMockTrack({ id: 12345 });
    const user = userEvent.setup();

    renderWithProviders(<TrackCard track={track} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(mockPush).toHaveBeenCalledWith('/track/12345');
  });

  it('should show preview badge for preview-only tracks', () => {
    const track = createMockTrack({
      access: 'preview',
    });

    renderWithProviders(<TrackCard track={track} />);

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should show not streamable indicator for blocked tracks', () => {
    const track = createMockTrack({
      streamable: false,
      access: 'blocked',
    });

    renderWithProviders(<TrackCard track={track} />);

    const indicator = screen.getByTitle('Not streamable - click to open in SoundCloud');
    expect(indicator).toBeInTheDocument();
  });

  it('should show download link for Bandcamp tracks', () => {
    const track = createMockTrack({
      purchase_url: 'https://artist.bandcamp.com/track/test',
    });

    renderWithProviders(<TrackCard track={track} />);

    const link = screen.getByTitle('Buy on Bandcamp');
    expect(link).toHaveAttribute('href', 'https://artist.bandcamp.com/track/test');
  });

  it('should show download link for Hypeddit tracks', () => {
    const track = createMockTrack({
      purchase_url: 'https://hypeddit.com/test',
    });

    renderWithProviders(<TrackCard track={track} />);

    const link = screen.getByTitle('Download on Hypeddit');
    expect(link).toHaveAttribute('href', 'https://hypeddit.com/test');
  });

  it('should format large numbers correctly', () => {
    const track = createMockTrack({
      likes_count: 1500000, // 1.5M
      reposts_count: 50000, // 50K
    });

    renderWithProviders(<TrackCard track={track} showStats={true} />);

    expect(screen.getByText('1.5M')).toBeInTheDocument();
    expect(screen.getByText('50.0K')).toBeInTheDocument();
  });

  it('should render in cover-only mode', () => {
    const track = createMockTrack({
      title: 'Test Track',
    });

    renderWithProviders(<TrackCard track={track} coverOnly={true} />);

    // Title should not be visible in cover-only mode
    expect(screen.queryByText('Test Track')).not.toBeInTheDocument();
    
    // But the image/button should exist
    const button = screen.getByRole('button', { name: track.title });
    expect(button).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    const track = createMockTrack({
      created_at: '2024-01-15T00:00:00Z',
    });

    renderWithProviders(<TrackCard track={track} />);

    // Should show formatted date (format depends on current year)
    expect(screen.getByText(/15\.01/)).toBeInTheDocument();
  });

  it('should handle missing artwork gracefully', () => {
    const track = createMockTrack({
      artwork_url: undefined,
      user: {
        ...createMockTrack().user,
        avatar_url: undefined,
      },
    });

    renderWithProviders(<TrackCard track={track} />);

    // Should show fallback icon
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

