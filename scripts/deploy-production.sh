#!/bin/bash

# Production Deployment Script for Fund Track App
# This script handles database migrations and deployment preparation

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Check if required environment variables are set
check_env_vars() {
    echo "📋 Checking environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "TWILIO_ACCOUNT_SID"
        "MAILGUN_API_KEY"
        "B2_APPLICATION_KEY_ID"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Error: $var is not set"
            exit 1
        fi
    done
    
    echo "✅ All required environment variables are set"
}

# Run database migrations
run_migrations() {
    echo "🗄️  Running database migrations..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Deploy migrations to production database
    npx prisma migrate deploy
    
    echo "✅ Database migrations completed"
}

# Build the application
build_app() {
    echo "🔨 Building application..."
    
    # Install dependencies
    npm ci --only=production
    
    # Build the Next.js application
    npm run build
    
    echo "✅ Application build completed"
}

# Run health checks
health_check() {
    echo "🏥 Running health checks..."
    
    # Wait for the application to start
    sleep 10
    
    # Check if health endpoint responds
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
        exit 1
    fi
}

# Backup database before deployment
backup_database() {
    echo "💾 Creating database backup..."
    
    if [ "$ENABLE_AUTOMATED_BACKUPS" = "true" ]; then
        # Extract database connection details
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        
        # Create backup filename with timestamp
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Create database backup
        PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE
        
        echo "✅ Database backup created: $BACKUP_FILE"
    else
        echo "⚠️  Automated backups disabled, skipping backup"
    fi
}

# Main deployment function
main() {
    echo "🎯 Production Deployment - Fund Track App"
    echo "================================================"
    
    check_env_vars
    backup_database
    run_migrations
    build_app
    
    echo ""
    echo "🎉 Production deployment completed successfully!"
    echo "📊 Run health checks after starting the application"
    echo "🔍 Monitor logs for any issues"
}

# Run main function
main "$@"