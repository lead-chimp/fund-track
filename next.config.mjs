import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 13+

  // Skip TypeScript checks during build for production deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Standalone output for production or when explicitly requested (e.g. Docker build with NODE_ENV=development)
  ...((process.env.NODE_ENV === "production" || process.env.BUILD_STANDALONE === "1") && {
    output: "standalone",
  }),

  // Ensure API routes don't try to connect to database during build
  serverExternalPackages: ["@prisma/client"],

  // Ensure API routes are not statically exported
  trailingSlash: false,

  // Security headers for production
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    let productionDomain = "fund-track.merchantfunding.com";

    if (process.env.NEXT_PUBLIC_BASE_URL) {
      try {
        productionDomain = new URL(process.env.NEXT_PUBLIC_BASE_URL).host;
      } catch (e) {
        console.warn(
          "Invalid NEXT_PUBLIC_BASE_URL, falling back to default domain",
        );
      }
    }

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.backblazeb2.com",
      "object-src 'none'",
      "base-uri 'self'",
      `form-action 'self' https://${productionDomain}`,
      "frame-ancestors 'none'",
    ];

    // Only add upgrade-insecure-requests in production
    if (isProduction) {
      cspDirectives.push("upgrade-insecure-requests");
    }

    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    let productionDomain = "fund-track.merchantfunding.com";

    if (process.env.NEXT_PUBLIC_BASE_URL) {
      try {
        productionDomain = new URL(process.env.NEXT_PUBLIC_BASE_URL).host;
      } catch (e) {
        console.warn(
          "Invalid NEXT_PUBLIC_BASE_URL, falling back to default domain",
        );
      }
    }

    if (
      process.env.NODE_ENV === "production" &&
      process.env.FORCE_HTTPS === "true"
    ) {
      return [
        {
          source: "/(.*)",
          has: [
            {
              type: "header",
              key: "x-forwarded-proto",
              value: "http",
            },
          ],
          destination: `https://${productionDomain}/:path*`,
          permanent: true,
        },
      ];
    }
    return [];
  },

  // Optimize for production
  poweredByHeader: false,
  compress: true,

  // Ensure the '@' alias resolves to the `src` directory (Turbopack is default in Next.js 16)
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // Webpack fallback (e.g. when using --webpack flag)
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
