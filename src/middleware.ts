import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function rateLimit(req: NextRequest): boolean {
  if (process.env.ENABLE_RATE_LIMITING !== 'true') {
    return true; // Rate limiting disabled
  }

  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }
  
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
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  
  // HTTPS enforcement
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  // Secure cookies in production
  if (process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true') {
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      const secureCookies = cookies.replace(/; secure/gi, '').replace(/$/g, '; Secure; SameSite=Strict');
      response.headers.set('set-cookie', secureCookies);
    }
  }
  
  return response;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Rate limiting check
    if (!rateLimit(req)) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '900', // 15 minutes
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 900)
        }
      });
    }

    // HTTPS enforcement
    if (process.env.NODE_ENV === 'production' && 
        process.env.FORCE_HTTPS === 'true' && 
        req.headers.get('x-forwarded-proto') === 'http') {
      return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
    }

    // Block suspicious requests
    const userAgent = req.headers.get('user-agent') || '';
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ];
    
    // Allow legitimate bots but block suspicious ones for sensitive routes
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent) && !userAgent.includes('Googlebot')) {
          return new NextResponse('Forbidden', { status: 403 });
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

    // Protect dashboard and API routes (except auth routes)
    if (pathname.startsWith("/dashboard") || 
        (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))) {
      
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }

      // Admin-only routes (if needed in the future)
      if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return addSecurityHeaders(NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to intake pages without authentication
        if (pathname.startsWith("/application/")) {
          return true
        }
        
        // Allow access to auth pages
        if (pathname.startsWith("/auth/")) {
          return true
        }

        // Allow health check endpoint
        if (pathname === "/api/health") {
          return true
        }
        
        // For protected routes, require authentication
        if (pathname.startsWith("/dashboard") || 
            (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/application/:path*",
    "/admin/:path*"
  ]
}