// Dokploy configuration for build and deployment
module.exports = {
  // Build configuration
  build: {
    // Environment variables for build time
    env: {
      SKIP_ENV_VALIDATION: "true",
      DATABASE_URL:
        "postgresql://placeholder:placeholder@placeholder:5432/placeholder",
      PRISMA_CLI_BINARY_TARGETS: "linux-musl,native",
      NODE_ENV: "production",
    },
    // Build commands for Railpack
    commands: ["npm ci", "npx prisma generate", "npm run build"],
  },

  // Deployment hooks - migrations run after successful deployment
  hooks: {
    // Post-deploy hook - runs migrations after app deployment
    postDeploy: "node scripts/dokploy-migrate.js",
  },

  // Runtime configuration
  runtime: {
    // Port configuration
    port: 3000,

    // Health check endpoints
    healthCheck: {
      path: "/api/health",
      interval: 30000,
      timeout: 5000,
      retries: 3,
    },

    // Readiness probe
    readinessProbe: {
      path: "/api/health/ready",
      initialDelaySeconds: 10,
      periodSeconds: 10,
    },
  },
};
