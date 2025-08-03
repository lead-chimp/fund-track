#!/bin/sh

# Debug script for checking migration files during deployment
# This helps diagnose why migrations might not be working

echo "🔍 Prisma Migration Debug Information"
echo "=====================================\n"

echo "📁 Current working directory:"
pwd
echo ""

echo "📁 App directory structure:"
ls -la /app/ || ls -la ./
echo ""

echo "📁 Prisma directory contents:"
if [ -d "/app/prisma" ]; then
    ls -la /app/prisma/
elif [ -d "./prisma" ]; then
    ls -la ./prisma/
else
    echo "❌ Prisma directory not found"
fi
echo ""

echo "📁 Migration files:"
if [ -d "/app/prisma/migrations" ]; then
    ls -la /app/prisma/migrations/
    echo "\n📄 Migration file details:"
    find /app/prisma/migrations -name "*.sql" -exec echo "File: {}" \; -exec head -5 {} \; -exec echo "" \;
elif [ -d "./prisma/migrations" ]; then
    ls -la ./prisma/migrations/
    echo "\n📄 Migration file details:"
    find ./prisma/migrations -name "*.sql" -exec echo "File: {}" \; -exec head -5 {} \; -exec echo "" \;
else
    echo "❌ Migration directory not found"
fi
echo ""

echo "🔧 Node modules Prisma:"
if [ -d "/app/node_modules/.prisma" ]; then
    ls -la /app/node_modules/.prisma/
elif [ -d "./node_modules/.prisma" ]; then
    ls -la ./node_modules/.prisma/
else
    echo "❌ .prisma directory not found in node_modules"
fi
echo ""

echo "🔧 Prisma CLI binary:"
if [ -d "/app/node_modules/prisma" ]; then
    ls -la /app/node_modules/prisma/
elif [ -d "./node_modules/prisma" ]; then
    ls -la ./node_modules/prisma/
else
    echo "❌ prisma directory not found in node_modules"
fi
echo ""

echo "🌍 Environment variables:"
echo "DATABASE_URL: ${DATABASE_URL:-(not set)}"
echo "NODE_ENV: ${NODE_ENV:-(not set)}"
echo "PRISMA_CLI_BINARY_TARGETS: ${PRISMA_CLI_BINARY_TARGETS:-(not set)}"
echo ""

echo "🔍 Prisma schema check:"
if [ -f "/app/prisma/schema.prisma" ]; then
    echo "✅ Schema file found at /app/prisma/schema.prisma"
    head -10 /app/prisma/schema.prisma
elif [ -f "./prisma/schema.prisma" ]; then
    echo "✅ Schema file found at ./prisma/schema.prisma"
    head -10 ./prisma/schema.prisma
else
    echo "❌ Schema file not found"
fi
echo ""

echo "🔧 Attempting to generate Prisma client:"
if npx prisma generate; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
fi
echo ""

echo "🔧 Testing database connection:"
if npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi
echo ""

echo "Debug information complete."
