/**
 * @jest-environment node
 */
import { createSession, verifySession, type SessionData } from '../session';

const sessionData: SessionData = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1234567890,
  userId: 42,
  username: 'tester',
};

describe('session (dormant while accounts are parked)', () => {
  const savedSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (savedSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = savedSecret;
    }
  });

  it('fails loudly without JWT_SECRET — no default secret', async () => {
    delete process.env.JWT_SECRET;
    await expect(createSession(sessionData)).rejects.toThrow(/JWT_SECRET/);
  });

  it('round-trips a session when JWT_SECRET is set', async () => {
    process.env.JWT_SECRET = 'test-secret-for-jest';
    const token = await createSession(sessionData);
    const decoded = await verifySession(token);
    expect(decoded).toMatchObject(sessionData);
  });

  it('verifySession returns null for garbage tokens', async () => {
    process.env.JWT_SECRET = 'test-secret-for-jest';
    expect(await verifySession('not-a-jwt')).toBeNull();
  });
});
