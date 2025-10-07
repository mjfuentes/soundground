import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect authenticated routes
 * Redirects to /login if user is not authenticated
 */
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const { pathname } = request.nextUrl;
  
  // Check if OAuth is configured
  const hasOAuthSecret = process.env.SOUNDCLOUD_CLIENT_SECRET && 
    process.env.SOUNDCLOUD_CLIENT_SECRET !== "your_client_secret_here";

  // If OAuth is not configured, allow all access (public API mode)
  if (!hasOAuthSecret) {
    return NextResponse.next();
  }

  // OAuth is configured - enforce authentication
  if (!sessionCookie) {
    // Allow access to login and auth routes
    if (
      pathname === "/login" ||
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/callback")
    ) {
      return NextResponse.next();
    }

    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Redirect to login for all other routes (pages)
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is authenticated and trying to access login, redirect to home
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

