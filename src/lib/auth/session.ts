import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: number;
  username: string;
}

/**
 * Create a JWT session token
 */
export async function createSession(data: SessionData): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

/**
 * Get session data from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session");
  
  if (!sessionToken) {
    return null;
  }

  return verifySession(sessionToken.value);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionData: SessionData): Promise<void> {
  const token = await createSession(sessionData);
  const cookieStore = await cookies();
  
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

