#!/bin/bash

# Database Backup Script for Production
# This script creates automated backups of the PostgreSQL database

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="merchant_funding_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "🚀 Starting database backup..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    log "❌ Error: DATABASE_URL environment variable not set"
    exit 1
fi

# Extract database connection details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Set default port if not specified
DB_PORT=${DB_PORT:-5432}

log "📋 Backup configuration:"
log "   Host: $DB_HOST"
log "   Port: $DB_PORT"
log "   Database: $DB_NAME"
log "   User: $DB_USER"
log "   Backup file: $BACKUP_PATH"

# Set PGPASSWORD for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create the backup
log "💾 Creating database backup..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_PATH"; then
    
    log "✅ Backup created successfully: $BACKUP_PATH"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "📊 Backup size: $BACKUP_SIZE"
    
else
    log "❌ Backup failed"
    exit 1
fi

# Upload to cloud storage if configured
if [ "$ENABLE_CLOUD_BACKUP" = "true" ] && [ -n "$BACKUP_STORAGE_BUCKET" ]; then
    log "☁️  Uploading backup to cloud storage..."
    
    # Example for AWS S3 (adjust for your cloud provider)
    if command -v aws &> /dev/null; then
        if aws s3 cp "$BACKUP_PATH" "s3://$BACKUP_STORAGE_BUCKET/database-backups/"; then
            log "✅ Backup uploaded to S3 successfully"
        else
            log "⚠️  Failed to upload backup to S3"
        fi
    else
        log "⚠️  AWS CLI not found, skipping cloud upload"
    fi
fi

# Clean up old backups
log "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "merchant_funding_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "merchant_funding_backup_*.sql" -type f | wc -l)
log "📁 Total backups retained: $BACKUP_COUNT"

# Verify backup integrity
log "🔍 Verifying backup integrity..."
if pg_restore --list "$BACKUP_PATH" > /dev/null 2>&1; then
    log "✅ Backup integrity verified"
else
    log "❌ Backup integrity check failed"
    exit 1
fi

# Send notification if configured
if [ "$ENABLE_BACKUP_NOTIFICATIONS" = "true" ] && [ -n "$ADMIN_EMAIL" ]; then
    log "📧 Sending backup notification..."
    
    # Simple email notification (requires mail command or similar)
    if command -v mail &> /dev/null; then
        echo "Database backup completed successfully at $(date)" | \
        mail -s "Database Backup Success - $(hostname)" "$ADMIN_EMAIL"
    fi
fi

log "🎉 Database backup completed successfully!"

# Unset password
unset PGPASSWORD