/**
 * @jest-environment node
 */
import {
  getApiV2ClientId,
  getOfficialCredentials,
  hasApiV2ClientId,
  hasOfficialCredentials,
  SoundCloudNotConfiguredError,
} from '../config';

const ENV_KEYS = [
  'SOUNDCLOUD_CLIENT_ID',
  'SOUNDCLOUD_CLIENT_SECRET',
  'SOUNDCLOUD_APIV2_CLIENT_ID',
] as const;

describe('soundcloud config', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('reports nothing configured when env is empty', () => {
    expect(getOfficialCredentials()).toBeNull();
    expect(getApiV2ClientId()).toBeNull();
    expect(hasOfficialCredentials()).toBe(false);
    expect(hasApiV2ClientId()).toBe(false);
  });

  it('requires BOTH official id and secret', () => {
    process.env.SOUNDCLOUD_CLIENT_ID = 'id-only';
    expect(getOfficialCredentials()).toBeNull();

    process.env.SOUNDCLOUD_CLIENT_SECRET = 'secret';
    expect(getOfficialCredentials()).toEqual({
      clientId: 'id-only',
      clientSecret: 'secret',
    });
  });

  it('reads the opt-in api-v2 client id', () => {
    process.env.SOUNDCLOUD_APIV2_CLIENT_ID = 'web-client-id';
    expect(getApiV2ClientId()).toBe('web-client-id');
    expect(hasApiV2ClientId()).toBe(true);
  });

  it('not-configured error names every relevant env var', () => {
    const error = new SoundCloudNotConfiguredError();
    expect(error.message).toContain('SOUNDCLOUD_CLIENT_ID');
    expect(error.message).toContain('SOUNDCLOUD_CLIENT_SECRET');
    expect(error.message).toContain('SOUNDCLOUD_APIV2_CLIENT_ID');
  });
});

describe('smart-client provider selection', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('fails loudly when nothing is configured — no silent fallback', async () => {
    const smartClient = await import('../smart-client');
    await expect(smartClient.getTracks(1)).rejects.toThrow(SoundCloudNotConfiguredError);
    await expect(smartClient.search('x')).rejects.toThrow(SoundCloudNotConfiguredError);
    await expect(smartClient.getTrackStreams(1)).rejects.toThrow(SoundCloudNotConfiguredError);
  });
});

describe('api-v2 fallback client', () => {
  const saved = process.env.SOUNDCLOUD_APIV2_CLIENT_ID;

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.SOUNDCLOUD_APIV2_CLIENT_ID;
    } else {
      process.env.SOUNDCLOUD_APIV2_CLIENT_ID = saved;
    }
  });

  it('throws a clear error when SOUNDCLOUD_APIV2_CLIENT_ID is unset', async () => {
    delete process.env.SOUNDCLOUD_APIV2_CLIENT_ID;
    const client = await import('../client');
    await expect(client.getTracks(1)).rejects.toThrow(/SOUNDCLOUD_APIV2_CLIENT_ID/);
  });
});
