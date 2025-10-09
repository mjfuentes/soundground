/**
 * Tests for TrackCard component
 */

import { renderWithProviders, createMockTrack, screen, fireEvent } from '@/test-utils';
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

  it('should navigate to track page when clicked', () => {
    const track = createMockTrack({ id: 12345 });

    renderWithProviders(<TrackCard track={track} />);

    const card = screen.getByTitle('View track details');
    fireEvent.click(card);

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

    const indicators = screen.getAllByTitle('Not streamable - click to open in SoundCloud');
    expect(indicators.length).toBeGreaterThan(0);
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
    
    // But the image and play button should exist
    const playButton = screen.getByRole('button', { name: 'Play' });
    expect(playButton).toBeInTheDocument();
    expect(screen.getByAltText('Test Track')).toBeInTheDocument();
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

    // Should show fallback music note icon
    const card = screen.getByTitle('View track details');
    const svg = card.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

