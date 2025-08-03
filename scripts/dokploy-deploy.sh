#!/bin/bash

# Dokploy Deployment Script for Fund Track App
# This script helps with deploying the application to Dokploy

set -e

echo "🚀 Dokploy Deployment Script for Fund Track App"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found."
    exit 1
fi

echo "✅ Project structure validated"

# Build the Docker image locally to test
echo "🔧 Building Docker image locally for testing..."
docker build -t fund-track-app:test . || {
    echo "❌ Docker build failed. Please check the Dockerfile and try again."
    exit 1
}

echo "✅ Docker image built successfully"

# Clean up test image
echo "🧹 Cleaning up test image..."
docker rmi fund-track-app:test || true

echo "🎉 Pre-deployment checks passed!"
echo ""
echo "Next steps for Dokploy deployment:"
echo "1. Ensure your PostgreSQL service is running in Dokploy"
echo "2. Update your environment variables in Dokploy application settings"
echo "3. Make sure DATABASE_URL points to your Dokploy PostgreSQL service"
echo "4. Deploy your application through Dokploy dashboard"
echo ""
echo "Important environment variables to set in Dokploy:"
echo "- DATABASE_URL=postgresql://postgres:password@your-postgres-service:5432/fund_track_app"
echo "- NODE_ENV=production"
echo "- NEXTAUTH_URL=https://your-domain.com"
echo "- NEXTAUTH_SECRET=your-secret-key"
echo "- All other production environment variables from .env.production.example"
echo ""
echo "The application will automatically run database migrations on startup."