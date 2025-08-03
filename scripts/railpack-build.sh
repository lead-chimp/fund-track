#!/bin/bash

# Railpack build script for Dokploy deployment
# This ensures Prisma is properly configured during the build phase

set -e

echo "🏗️ Starting Railpack build for Fund Track App..."

# Set environment variables for build
export SKIP_ENV_VALIDATION=true
export DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
export PRISMA_CLI_BINARY_TARGETS="linux-musl,native"
export NODE_ENV=production

echo "📦 Installing dependencies..."
npm ci

echo "🔧 Generating Prisma client for build..."
npx prisma generate

echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Railpack build completed successfully!"

# Create a build info file for debugging
cat > build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "prismaVersion": "$(npx prisma --version | head -1)",
  "buildEnvironment": {
    "SKIP_ENV_VALIDATION": "$SKIP_ENV_VALIDATION",
    "PRISMA_CLI_BINARY_TARGETS": "$PRISMA_CLI_BINARY_TARGETS",
    "NODE_ENV": "$NODE_ENV"
  }
}
EOF

echo "📝 Build info saved to build-info.json"
