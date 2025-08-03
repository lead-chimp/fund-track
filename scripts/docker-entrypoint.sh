#!/bin/sh

# Docker entrypoint script for Fund Track App
# This script runs database migrations and starts the application

set -e

echo "🚀 Starting Fund Track App..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if npx prisma db push --accept-data-loss 2>/dev/null; then
        echo "✅ Database is ready"
        break
    else
        echo "⏳ Database not ready yet (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ ERROR: Database is not ready after $max_attempts attempts"
    exit 1
fi

# Check if migration files exist
if [ ! -d "/app/prisma/migrations" ]; then
    echo "❌ ERROR: Migration files not found in /app/prisma/migrations"
    echo "📁 Available files in /app/prisma:"
    ls -la /app/prisma/ || echo "Prisma directory not found"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
echo "📁 Migration files found:"
ls -la /app/prisma/migrations/

if npx prisma migrate deploy; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ ERROR: Database migrations failed"
    echo "🔍 Debugging info:"
    echo "Current directory: $(pwd)"
    echo "Prisma directory contents:"
    ls -la /app/prisma/
    echo "Migration directory contents:"
    ls -la /app/prisma/migrations/ || echo "Migration directory not accessible"
    exit 1
fi

# Generate Prisma client (in case it's needed)
echo "🔧 Generating Prisma client..."
if npx prisma generate; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ WARNING: Prisma client generation failed, but continuing..."
fi

echo "🎉 Database setup completed successfully"

# Start the application
echo "🚀 Starting the application..."
exec "$@"