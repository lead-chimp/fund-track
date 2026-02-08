import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { checkBotProtection } from "@/lib/middleware/bot-protection";
import {
  validateEnvironment,
  addSecurityHeaders,
  checkHttpsEnforcement
} from "@/lib/middleware/utils";
import {
  isPublicRoute,
  isAdminRoute,
  isSystemAdminRoute
} from "@/lib/middleware/route-matchers";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requestId = Math.random().toString(36).substring(7);

  // CRITICAL: IMMEDIATELY bypass EVERYTHING for NextAuth routes
  // No session lookup, no rate limiting, no checks - absolute bypass
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Cron routes: called by Coolify with CRON_SECRET; no HTTPS/rate-limit/bot/auth here
  if (pathname.startsWith("/api/cron")) {
    return addSecurityHeaders(req, NextResponse.next());
  }

  console.log(`[Proxy Debug][${requestId}] Processing request:`, pathname);

  const token = req.auth; // In v5, req.auth is the session/token

  try {
    // 1. Validation
    validateEnvironment();

    // 2. Rate Limiting
    console.log(`[Proxy Debug][${requestId}] Checking rate limit...`);
    const rateLimitResponse = checkRateLimit(req);
    if (rateLimitResponse) {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      console.warn(`[Proxy Debug][${requestId}] RATE LIMIT EXCEEDED:
        - IP: ${ip}
        - Path: ${pathname}
        - User Agent: ${req.headers.get("user-agent")}
      `);
      return rateLimitResponse;
    }

    // 3. HTTPS Enforcement
    console.log("[Proxy Debug] Checking HTTPS...");
    const httpsRedirect = checkHttpsEnforcement(req);
    if (httpsRedirect) {
      console.log("[Proxy Debug] Redirecting to HTTPS:", pathname);
      return httpsRedirect;
    }

    // 4. Bot Protection
    console.log("[Proxy Debug] Checking bot protection...");
    const botProtectionResponse = checkBotProtection(req);
    if (botProtectionResponse) {
      console.log("[Proxy Debug] Bot protection blocked:", pathname);
      return botProtectionResponse;
    }

    // 5. Route Authorization Logic
    console.log("[Proxy Debug] Checking RBAC for:", pathname, "Role:", token?.user?.role);

    // Public routes are always authorized
    const isPublic = isPublicRoute(pathname);
    if (isPublic) {
      console.log("[Proxy Debug] Public route allowed");
      return addSecurityHeaders(req, NextResponse.next());
    }

    // Protected routes requiring authentication
    if (!token) {
      console.log("[Proxy Debug] No token for protected route, redirecting to signin");
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // System Admin Routes
    if (isSystemAdminRoute(pathname)) {
      if (token.user?.role !== "SYSTEM_ADMIN") {
        console.log("[Proxy Debug] Insufficient role for system admin route, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin Routes
    if (isAdminRoute(pathname)) {
      if (token.user?.role !== "ADMIN" && token.user?.role !== "SYSTEM_ADMIN") {
        console.log("[Proxy Debug] Insufficient role for admin route, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 6. Final Response with Headers
    console.log(`[Proxy Debug][${requestId}] Request allowed:`, pathname);
    return addSecurityHeaders(req, NextResponse.next());
  } catch (error) {
    console.error(`[Proxy Debug][${requestId}] Error in proxy:`, error);
    return addSecurityHeaders(req, NextResponse.next());
  }
});

// Configure matcher to exclude auth routes and static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
