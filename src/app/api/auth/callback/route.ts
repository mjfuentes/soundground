import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForToken,
  getCurrentUser,
} from "@/lib/auth/soundcloud-oauth";
import { setSessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/login?error=missing_parameters", request.url)
      );
    }

    // Verify state to prevent CSRF attacks
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state");
    const codeVerifier = cookieStore.get("oauth_code_verifier");

    if (!storedState || storedState.value !== state) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", request.url)
      );
    }

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL("/login?error=missing_verifier", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(
      code,
      codeVerifier.value
    );

    // Get user profile
    const user = await getCurrentUser(tokenResponse.access_token);

    // Create session
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    await setSessionCookie({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      userId: user.id,
      username: user.username,
    });

    // Clean up OAuth cookies
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_code_verifier");

    // Redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/login?error=authentication_failed", request.url)
    );
  }
}

