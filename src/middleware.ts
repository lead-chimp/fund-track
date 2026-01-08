import { withAuth } from "next-auth/middleware";
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

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // 1. Validation
    validateEnvironment();

    // 2. Rate Limiting
    const rateLimitResponse = checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    // 3. HTTPS Enforcement
    const httpsRedirect = checkHttpsEnforcement(req);
    if (httpsRedirect) return httpsRedirect;

    // 4. Bot Protection
    const botProtectionResponse = checkBotProtection(req);
    if (botProtectionResponse) return botProtectionResponse;

    // 5. Route Authorization Logic
    // Note: Basic authentication is handled by the `authorized` callback below.
    // This section handles Role-Based Access Control (RBAC) and specific redirects.

    // System Admin Routes
    if (isSystemAdminRoute(pathname)) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      if (token.role !== "SYSTEM_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin Routes
    if (isAdminRoute(pathname)) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      if (token.role !== "ADMIN" && token.role !== "SYSTEM_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 6. Final Response with Headers
    return addSecurityHeaders(req, NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes are always authorized
        if (isPublicRoute(pathname)) {
          return true;
        }

        // Protected routes require a token
        if (isProtectedRoute(pathname)) {
          return !!token;
        }

        // Default to allowing access if not explicitly protected
        // (This allows Next.js to serve static files, images, etc. freely)
        return true;
      },
    },
  }
);

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