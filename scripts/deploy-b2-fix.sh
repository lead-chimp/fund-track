#!/bin/bash

# Deployment script for B2 authorization fix
# This script helps deploy the FileUploadService improvements

set -e

echo "🚀 Deploying B2 Authorization Fix"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if the fix is in place
if grep -q "needsReauthorization" src/services/FileUploadService.ts; then
    echo "✅ B2 authorization fix detected in FileUploadService.ts"
else
    echo "❌ Error: B2 authorization fix not found. Please ensure the FileUploadService.ts has been updated."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test B2 connection (optional, only if in production environment)
if [ "$NODE_ENV" = "production" ]; then
    echo "🔧 Testing B2 connection..."
    if node scripts/test-b2-connection.mjs; then
        echo "✅ B2 connection test passed"
    else
        echo "⚠️  B2 connection test failed, but continuing with deployment"
    fi
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "📋 Summary of changes:"
echo "   • Added automatic B2 token re-authorization (23-hour cycle)"
echo "   • Implemented retry logic for 401 authorization errors"
echo "   • Enhanced logging for B2 operations"
echo "   • Added structured error handling"
echo ""
echo "🔄 Next steps:"
echo "   1. Deploy the built application to your production environment"
echo "   2. Monitor logs for B2 operations using the new structured logging"
echo "   3. Verify that document downloads work correctly"
echo ""
echo "📊 Monitoring:"
echo "   • Look for '[EXTERNAL_SERVICE] Backblaze B2' log entries"
echo "   • Check for successful re-authorization events"
echo "   • Monitor retry attempts and their success rates"