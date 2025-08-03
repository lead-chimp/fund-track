#!/bin/bash

# Pre-start hook for Dokploy deployment
# This script runs before the application starts to ensure migrations are applied

set -e

echo "🔄 Pre-start hook: Running migrations and seeding..."

# Set Node.js environment
export NODE_ENV=production

# Run the migration and seeding script
node /app/scripts/deploy-migrate.js

echo "✅ Pre-start hook completed successfully"
