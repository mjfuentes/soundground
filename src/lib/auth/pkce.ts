import crypto from "crypto";

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate the code challenge from the code verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

