#!/bin/bash

# Docker entrypoint script for automated migrations
# This ensures migrations run before the application starts

set -e

echo "🚀 Starting Fund Track application with automated migrations..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to become ready after 30 attempts"
        exit 1
    fi
    
    echo "   Attempt $i/30 - Database not ready, waiting 2 seconds..."
    sleep 2
done

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Check if we should seed the database
if [ "$FORCE_SEED" = "true" ] || [ "$NODE_ENV" != "production" ]; then
    echo "🌱 Seeding database..."
    npm run db:seed || {
        echo "⚠️ Seeding failed, but continuing with application startup"
    }
else
    echo "ℹ️ Skipping database seeding (set FORCE_SEED=true to enable)"
fi

# Verify everything is working
echo "✅ Running verification check..."
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM User LIMIT 1;" > /dev/null || {
    echo "⚠️ Database verification failed, but continuing with startup"
}

echo "🎉 Pre-startup checks completed successfully!"

# Start the application
echo "🌟 Starting Next.js application..."
exec "$@"
