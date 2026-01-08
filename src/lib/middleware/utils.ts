import { NextRequest, NextResponse } from "next/server";

export function validateEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    const requiredEnvVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'DATABASE_URL'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        const errorMsg = `CRITICAL: Missing required environment variable: ${envVar}`;
        console.error(errorMsg);
        // We throw an error to stop execution if critical vars are missing
        throw new Error(errorMsg);
      }
    }
  }
}

export function addSecurityHeaders(req: NextRequest, response: NextResponse): NextResponse {
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

  return response;
}

export function checkHttpsEnforcement(req: NextRequest): NextResponse | null {
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
  return null;
}
