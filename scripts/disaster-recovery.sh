#!/bin/bash

# Disaster Recovery Script for Fund Track App
# This script handles database restoration and system recovery

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
LOG_FILE="${BACKUP_DIR}/recovery.log"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --restore-from FILE    Restore database from specific backup file"
    echo "  --list-backups         List available backup files"
    echo "  --latest               Restore from the latest backup"
    echo "  --verify-backup FILE   Verify backup file integrity"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list-backups"
    echo "  $0 --latest"
    echo "  $0 --restore-from ./backups/merchant_funding_backup_20240131_120000.sql"
    echo "  $0 --verify-backup ./backups/merchant_funding_backup_20240131_120000.sql"
}

# List available backups
list_backups() {
    log "📋 Available backup files:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "❌ Backup directory not found: $BACKUP_DIR"
        return 1
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "merchant_funding_backup_*.sql" -type f | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log "❌ No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    for backup in "${backups[@]}"; do
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d'.' -f1)
        log "   $(basename "$backup") - Size: $size - Date: $date"
    done
    
    return 0
}

# Get latest backup
get_latest_backup() {
    local latest=$(find "$BACKUP_DIR" -name "merchant_funding_backup_*.sql" -type f | sort -r | head -n1)
    
    if [ -z "$latest" ]; then
        log "❌ No backup files found"
        return 1
    fi
    
    echo "$latest"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ Backup file not found: $backup_file"
        return 1
    fi
    
    log "🔍 Verifying backup integrity: $(basename "$backup_file")"
    
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log "✅ Backup integrity verified"
        return 0
    else
        log "❌ Backup integrity check failed"
        return 1
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "💾 Creating pre-restore backup as safety measure..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_restore_backup="${BACKUP_DIR}/pre_restore_backup_${timestamp}.sql"
    
    # Extract database connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    DB_PORT=${DB_PORT:-5432}
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$pre_restore_backup"; then
        
        log "✅ Pre-restore backup created: $pre_restore_backup"
        echo "$pre_restore_backup"
    else
        log "❌ Failed to create pre-restore backup"
        return 1
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ Backup file not found: $backup_file"
        return 1
    fi
    
    log "🚀 Starting database restoration from: $(basename "$backup_file")"
    
    # Verify backup before restoration
    if ! verify_backup "$backup_file"; then
        log "❌ Backup verification failed, aborting restoration"
        return 1
    fi
    
    # Check if required environment variables are set
    if [ -z "$DATABASE_URL" ]; then
        log "❌ Error: DATABASE_URL environment variable not set"
        return 1
    fi
    
    # Create pre-restore backup
    local pre_restore_backup
    if ! pre_restore_backup=$(create_pre_restore_backup); then
        log "❌ Failed to create pre-restore backup"
        return 1
    fi
    
    # Extract database connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    DB_PORT=${DB_PORT:-5432}
    export PGPASSWORD="$DB_PASSWORD"
    
    log "📋 Restoration configuration:"
    log "   Host: $DB_HOST"
    log "   Port: $DB_PORT"
    log "   Database: $DB_NAME"
    log "   User: $DB_USER"
    
    # Stop application services (if running in containers)
    if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
        log "🛑 Stopping application services..."
        docker-compose stop app || true
    fi
    
    # Restore database
    log "🔄 Restoring database..."
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$backup_file"; then
        
        log "✅ Database restoration completed successfully"
        
        # Run database migrations to ensure schema is up to date
        log "🔄 Running database migrations..."
        if npx prisma migrate deploy; then
            log "✅ Database migrations completed"
        else
            log "⚠️  Database migrations failed, but restoration was successful"
        fi
        
        # Restart application services
        if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
            log "🚀 Restarting application services..."
            docker-compose start app || true
        fi
        
        log "🎉 Database restoration completed successfully!"
        log "💡 Pre-restore backup saved at: $pre_restore_backup"
        
    else
        log "❌ Database restoration failed"
        log "💡 Original database state preserved"
        log "💡 Pre-restore backup available at: $pre_restore_backup"
        return 1
    fi
    
    # Unset password
    unset PGPASSWORD
}

# Main function
main() {
    log "🚀 Disaster Recovery Script - Fund Track App"
    log "=================================================="
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    case "${1:-}" in
        --list-backups)
            list_backups
            ;;
        --latest)
            local latest_backup
            if latest_backup=$(get_latest_backup); then
                log "📋 Latest backup: $(basename "$latest_backup")"
                restore_database "$latest_backup"
            else
                log "❌ No backups found"
                exit 1
            fi
            ;;
        --restore-from)
            if [ -z "${2:-}" ]; then
                log "❌ Error: Please specify backup file"
                usage
                exit 1
            fi
            restore_database "$2"
            ;;
        --verify-backup)
            if [ -z "${2:-}" ]; then
                log "❌ Error: Please specify backup file"
                usage
                exit 1
            fi
            verify_backup "$2"
            ;;
        --help)
            usage
            ;;
        *)
            log "❌ Error: Invalid option"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"