import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function rateLimit(req: NextRequest): boolean {
  if (process.env.ENABLE_RATE_LIMITING !== "true") {
    return true; // Rate limiting disabled
  }

  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100");

  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  Array.from(rateLimitStore.entries()).forEach(([key, value]) => {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  });

  const current = rateLimitStore.get(ip);

  if (!current) {
    rateLimitStore.set(ip, { count: 1, resetTime: now });
    return true;
  }

  if (current.resetTime < windowStart) {
    rateLimitStore.set(ip, { count: 1, resetTime: now });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

// Security headers function
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Additional security headers not covered by next.config.mjs
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  // HTTPS enforcement
  if (
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_HTTPS === "true"
  ) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Secure cookies in production
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SECURE_COOKIES === "true"
  ) {
    const cookies = response.headers.get("set-cookie");
    if (cookies) {
      const secureCookies = cookies
        .replace(/; secure/gi, "")
        .replace(/$/g, "; Secure; SameSite=Strict");
      response.headers.set("set-cookie", secureCookies);
    }
  }

  return response;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Rate limiting check
    if (!rateLimit(req)) {
      // Return JSON for API routes, HTML for page routes
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            code: "RATE_LIMIT_ERROR",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: 900,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "900", // 15 minutes
              "X-RateLimit-Limit": process.env.RATE_LIMIT_MAX_REQUESTS || "100",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 900),
            },
          }
        );
      } else {
        // For page routes, return HTML error page
        return new NextResponse(
          `<!DOCTYPE html>
<html>
<head>
  <title>Rate Limit Exceeded</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; text-align: center; }
    .error { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #dc2626; margin-bottom: 16px; }
    p { color: #6b7280; margin-bottom: 24px; }
    .retry { color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">
      <h1>Too Many Requests</h1>
      <p>You've made too many requests. Please wait a moment and try again.</p>
      <p class="retry">Please wait 15 minutes before trying again.</p>
    </div>
  </div>
</body>
</html>`,
          {
            status: 429,
            headers: {
              "Content-Type": "text/html",
              "Retry-After": "900", // 15 minutes
              "X-RateLimit-Limit": process.env.RATE_LIMIT_MAX_REQUESTS || "100",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 900),
            },
          }
        );
      }
    }

    // HTTPS enforcement
    if (
      process.env.NODE_ENV === "production" &&
      process.env.FORCE_HTTPS === "true" &&
      req.headers.get("x-forwarded-proto") === "http"
    ) {
      return NextResponse.redirect(
        `https://${req.headers.get("host")}${req.nextUrl.pathname}${
          req.nextUrl.search
        }`,
        301
      );
    }

    // Block suspicious requests
    const userAgent = req.headers.get("user-agent") || "";
    const suspiciousPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];

    // Allow legitimate bots but block suspicious ones for sensitive routes
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/health")) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent) && !userAgent.includes("Googlebot")) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
    }

    // Allow access to intake pages without authentication
    if (pathname.startsWith("/application/")) {
      return addSecurityHeaders(NextResponse.next());
    }

    // Allow health check endpoint
    if (pathname === "/api/health") {
      return addSecurityHeaders(NextResponse.next());
    }

    // Allow intake API endpoints without authentication
    if (pathname.startsWith("/api/intake/")) {
      return addSecurityHeaders(NextResponse.next());
    }

    // Allow dev endpoints only for SYSTEM_ADMIN users
    if (pathname.startsWith("/api/dev/")) {
      // Require SYSTEM_ADMIN role
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }

      if (token.role !== "SYSTEM_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      return addSecurityHeaders(NextResponse.next());
    }

    // Protect dev pages - require SYSTEM_ADMIN role
    if (pathname.startsWith("/dev/")) {
      // Require authentication and SYSTEM_ADMIN role
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }

      if (token.role !== "SYSTEM_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      return addSecurityHeaders(NextResponse.next());
    }

    // Protect dashboard and API routes (except auth and intake routes)
    if (
      pathname.startsWith("/dashboard") ||
      (pathname.startsWith("/api") &&
        !pathname.startsWith("/api/auth") &&
        !pathname.startsWith("/api/intake/"))
    ) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }

      // Admin-only routes (if needed in the future)
      if (
        pathname.startsWith("/admin") &&
        token.role !== "ADMIN" &&
        token.role !== "SYSTEM_ADMIN"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return addSecurityHeaders(NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to intake pages without authentication
        if (pathname.startsWith("/application/")) {
          return true;
        }

        // Allow access to auth pages
        if (pathname.startsWith("/auth/")) {
          return true;
        }

        // Allow health check endpoint
        if (pathname === "/api/health") {
          return true;
        }

        // Allow intake API endpoints without authentication
        if (pathname.startsWith("/api/intake/")) {
          return true;
        }

        // Allow dev endpoints - require authentication, role check in main middleware
        if (pathname.startsWith("/api/dev/")) {
          return !!token;
        }

        // Allow dev pages - require authentication, role check in main middleware
        if (pathname.startsWith("/dev/")) {
          return !!token;
        }

        // For protected routes, require authentication
        if (
          pathname.startsWith("/dashboard") ||
          (pathname.startsWith("/api") &&
            !pathname.startsWith("/api/auth") &&
            !pathname.startsWith("/api/intake/"))
        ) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/application/:path*",
    "/admin/:path*",
    "/dev/:path*",
  ],
};
