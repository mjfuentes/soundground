import { NextResponse } from "next/server";
import { generateAuthorizationUrl } from "@/lib/auth/soundcloud-oauth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const { authUrl, codeVerifier, state } = generateAuthorizationUrl();

    // Store code verifier and state in cookies for verification in callback
    const cookieStore = await cookies();
    cookieStore.set("oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Redirect to SoundCloud authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error generating authorization URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate login" },
      { status: 500 }
    );
  }
}

