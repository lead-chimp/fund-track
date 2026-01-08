import { NextRequest, NextResponse } from "next/server";

// Refined bot detection patterns
const SUSPICIOUS_PATTERNS = [
  /bot(?!(?:google|bing|yahoo|duckduckbot))/i, 
  /crawler(?!(?:google|bing|yahoo))/i, 
  /spider(?!(?:google|bing|yahoo))/i, 
  /scraper/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /seobility/i
];

const ALLOWED_SEARCH_ENGINES = /google|bing|yahoo|duckduckbot/i;

export function checkBotProtection(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  
  // Only check specific routes (API and public forms)
  // Health check should be fast and simple, might skip bot check or keep it
  if (
    (pathname.startsWith("/api/") && !pathname.startsWith("/api/health")) ||
    pathname.startsWith("/application/")
  ) {
    const userAgent = req.headers.get("user-agent") || "";
    
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(userAgent)) {
        // Double check if it's a known search engine bot to be safe
        // (The regex lookahead already handles most, but this is a safety net)
        if (!ALLOWED_SEARCH_ENGINES.test(userAgent)) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
    }
  }

  return null; // Proceed
}
