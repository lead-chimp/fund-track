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
  isSystemAdminRoute,
  isProtectedRoute
} from "@/lib/middleware/route-matchers";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // IMMEDIATELY bypass our middleware logic for NextAuth internal routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  console.log("[Middleware Debug] Processing request:", pathname);

  const token = req.auth; // In v5, req.auth is the session/token

  try {
    // 1. Validation
    validateEnvironment();

    // 2. Rate Limiting
    console.log("[Middleware Debug] Checking rate limit...");
    const rateLimitResponse = checkRateLimit(req);
    if (rateLimitResponse) {
      console.log("[Middleware Debug] Rate limit exceeded for:", pathname);
      return rateLimitResponse;
    }

    // 3. HTTPS Enforcement
    console.log("[Middleware Debug] Checking HTTPS...");
    const httpsRedirect = checkHttpsEnforcement(req);
    if (httpsRedirect) {
      console.log("[Middleware Debug] Redirecting to HTTPS:", pathname);
      return httpsRedirect;
    }

    // 4. Bot Protection
    console.log("[Middleware Debug] Checking bot protection...");
    const botProtectionResponse = checkBotProtection(req);
    if (botProtectionResponse) {
      console.log("[Middleware Debug] Bot protection blocked:", pathname);
      return botProtectionResponse;
    }

    // 5. Route Authorization Logic
    console.log("[Middleware Debug] Checking RBAC for:", pathname, "Role:", token?.user?.role);

    // Public routes are always authorized
    const isPublic = isPublicRoute(pathname);
    if (isPublic) {
      console.log("[Middleware Debug] Public route allowed");
      return addSecurityHeaders(req, NextResponse.next());
    }

    // Protected routes requiring authentication
    if (!token) {
      console.log("[Middleware Debug] No token for protected route, redirecting to signin");
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // System Admin Routes
    if (isSystemAdminRoute(pathname)) {
      if (token.user?.role !== "SYSTEM_ADMIN") {
        console.log("[Middleware Debug] Insufficient role for system admin route, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin Routes
    if (isAdminRoute(pathname)) {
      if (token.user?.role !== "ADMIN" && token.user?.role !== "SYSTEM_ADMIN") {
        console.log("[Middleware Debug] Insufficient role for admin route, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 6. Final Response with Headers
    console.log("[Middleware Debug] Request allowed:", pathname);
    return addSecurityHeaders(req, NextResponse.next());
  } catch (error) {
    console.error("[Middleware Debug] Error in middleware:", error);
    return addSecurityHeaders(req, NextResponse.next());
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/admin/:path*",
    "/dev/:path*",
    "/application/:path*",
    // Note: We include all routes that need middleware processing.
    // Static assets are generally excluded by Next.js automatically from middleware unless configured otherwise.
  ],
};