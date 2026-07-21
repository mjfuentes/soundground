/**
 * @jest-environment node
 */
import got from 'got';
import * as officialClient from '../official-client';

jest.mock('got', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../client-credentials', () => ({
  getClientCredentialsToken: jest.fn().mockResolvedValue('test-token'),
  hasClientCredentials: jest.fn().mockReturnValue(true),
}));

const gotMock = got as unknown as jest.Mock;

function mockResponse(data: unknown) {
  gotMock.mockReturnValueOnce({
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('official-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('urn helpers', () => {
    it('extracts numeric ids from urns', () => {
      expect(officialClient.urnToId('soundcloud:tracks:123')).toBe(123);
      expect(officialClient.urnToId('soundcloud:users:42')).toBe(42);
    });

    it('returns 0 for missing or malformed urns', () => {
      expect(officialClient.urnToId(undefined)).toBe(0);
      expect(officialClient.urnToId('garbage')).toBe(0);
    });

    it('builds urns from ids', () => {
      expect(officialClient.userUrn(7)).toBe('soundcloud:users:7');
      expect(officialClient.trackUrn(7)).toBe('soundcloud:tracks:7');
      expect(officialClient.playlistUrn(7)).toBe('soundcloud:playlists:7');
    });
  });

  describe('getTrack', () => {
    it('maps official track fields to app shape', async () => {
      mockResponse({
        urn: 'soundcloud:tracks:555',
        title: 'Test Track',
        permalink_url: 'https://soundcloud.com/a/test',
        duration: 60000,
        playback_count: 10,
        favoritings_count: 5,
        reposts_count: 2,
        access: 'playable',
        streamable: true,
        purchase_url: 'https://artist.bandcamp.com/track/test',
        user: { urn: 'soundcloud:users:9', username: 'artist', permalink_url: 'https://soundcloud.com/a' },
      });

      const track = await officialClient.getTrack(555);

      expect(track).not.toBeNull();
      expect(track!.id).toBe(555);
      expect(track!.likes_count).toBe(5); // favoritings_count mapped
      expect(track!.purchase_url).toBe('https://artist.bandcamp.com/track/test');
      expect(track!.user.id).toBe(9);

      // Requested by urn with OAuth header
      const [url, opts] = gotMock.mock.calls[0];
      expect(url).toContain('/tracks/soundcloud:tracks:555');
      expect(opts.headers.Authorization).toBe('OAuth test-token');
    });

    it('returns null on API error', async () => {
      gotMock.mockReturnValueOnce({
        text: () => Promise.reject(new Error('404')),
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const track = await officialClient.getTrack(1);
      expect(track).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('getPlaylists / getAlbums', () => {
    // The live API returns playlist_type in UPPERCASE (verified Jul 2026).
    const rawPlaylists = {
      collection: [
        { urn: 'soundcloud:playlists:1', title: 'Mix', playlist_type: 'PLAYLIST', track_count: 3 },
        { urn: 'soundcloud:playlists:2', title: 'LP', playlist_type: 'ALBUM', track_count: 10 },
        { urn: 'soundcloud:playlists:3', title: 'EP', playlist_type: 'ep', track_count: 4 },
      ],
    };

    it('getPlaylists excludes album-type sets (api-v2 parity)', async () => {
      mockResponse(rawPlaylists);
      const { collection } = await officialClient.getPlaylists(9);
      expect(collection.map((p) => p.id)).toEqual([1]);
      expect(collection[0].is_album).toBe(false);
    });

    it('getAlbums returns only album-type sets', async () => {
      mockResponse(rawPlaylists);
      const { collection } = await officialClient.getAlbums(9);
      expect(collection.map((p) => p.id)).toEqual([2, 3]);
      expect(collection.every((p) => p.is_album)).toBe(true);
    });
  });

  describe('getFollowers', () => {
    it('maps followers and preserves next_href', async () => {
      mockResponse({
        collection: [
          { urn: 'soundcloud:users:1', username: 'a', followers_count: 10 },
          { urn: 'soundcloud:users:2', username: 'b', followers_count: 20 },
        ],
        next_href: 'https://api.soundcloud.com/users/soundcloud:users:9/followers?cursor=x',
      });

      const result = await officialClient.getFollowers(9);
      expect(result.collection).toHaveLength(2);
      expect(result.collection[0].id).toBe(1);
      expect(result.next_href).toContain('cursor=x');
    });

    it('follows next_href directly when provided', async () => {
      mockResponse({ collection: [] });
      await officialClient.getFollowers(9, 200, 'https://api.soundcloud.com/next-page');
      const [url] = gotMock.mock.calls[0];
      expect(url).toBe('https://api.soundcloud.com/next-page');
    });

    it('REGRESSION: never passes searchParams for next_href requests (got would strip the cursor)', async () => {
      // got's searchParams option REPLACES the URL's query string. Passing
      // even {} for a next_href request strips the pagination cursor,
      // resetting to page one — which once produced an infinite crawl loop.
      mockResponse({ collection: [] });
      const nextHref =
        'https://api.soundcloud.com/users/soundcloud:users:9/followings?linked_partitioning=true&cursor=1736764361290&page_size=200';
      await officialClient.getFollowings(9, 200, nextHref);
      const [url, opts] = gotMock.mock.calls[0];
      expect(url).toBe(nextHref);
      expect(opts.searchParams).toBeUndefined();
    });

    it('applies a request timeout to every call', async () => {
      mockResponse({ collection: [] });
      await officialClient.getFollowers(9);
      const [, opts] = gotMock.mock.calls[0];
      expect(opts.timeout?.request).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('routes filter=users to the /users endpoint', async () => {
      mockResponse({ collection: [{ urn: 'soundcloud:users:5', username: 'x' }] });
      const result = await officialClient.search('techno', { filter: 'users' });
      const [url] = gotMock.mock.calls[0];
      expect(url).toContain('/users');
      expect(result.collection).toHaveLength(1);
    });

    it('fans out to users+tracks+playlists when unfiltered', async () => {
      mockResponse({ collection: [] }); // users
      mockResponse({ collection: [] }); // tracks
      mockResponse({ collection: [] }); // playlists
      await officialClient.search('techno');
      expect(gotMock).toHaveBeenCalledTimes(3);
    });
  });
});
