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

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ ERROR: Database migrations failed"
    exit 1
fi

# Generate Prisma client (in case it's needed)
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Database setup completed successfully"

# Start the application
echo "🚀 Starting the application..."
exec "$@"