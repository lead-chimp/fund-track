import { NextRequest, NextResponse } from "next/server";

// Rate limiting store (in production, use Redis or similar)
// Note: In serverless, this Map is not shared across instances and resets on cold starts.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const windowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = 100; // limit each IP to 100 requests per windowMs

export function checkRateLimit(req: NextRequest): NextResponse | null {
  if (process.env.ENABLE_RATE_LIMITING !== "true") {
    return null; // Rate limiting disabled
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : req.headers.get("x-real-ip") || "unknown";

  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000");

  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  // Optimization: specific cleanup instead of full iteration could be better for high traffic,
  // but for this simple implementation, we'll cleanup only when accessing.

  const current = rateLimitStore.get(ip);

  if (!current || current.resetTime < windowStart) {
    rateLimitStore.set(ip, { count: 1, resetTime: now });
    return null;
  }

  if (current.count >= maxRequests) {
    return createRateLimitResponse(req, maxRequests);
  }

  current.count++;
  return null; // Proceed
}

function createRateLimitResponse(
  req: NextRequest,
  maxRequests: number,
): NextResponse {
  const { pathname } = req.nextUrl;
  const retryAfter = 900; // 15 minutes in seconds

  const headers = {
    "Content-Type": pathname.startsWith("/api/")
      ? "application/json"
      : "text/html",
    "Retry-After": String(retryAfter),
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + retryAfter),
  };

  if (pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        code: "RATE_LIMIT_ERROR",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
      }),
      { status: 429, headers },
    );
  } else {
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
      { status: 429, headers },
    );
  }
}
