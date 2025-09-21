# Database Backup and Restore

<cite>
**Referenced Files in This Document**   
- [backup-database.sh](file://scripts/backup-database.sh)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)
- [20240101000000_init/migration.sql](file://prisma/migrations/20240101000000_init/migration.sql)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Backup Implementation](#backup-implementation)
3. [Disaster Recovery Process](#disaster-recovery-process)
4. [Backup Storage and Retention](#backup-storage-and-retention)
5. [Execution Procedures](#execution-procedures)
6. [Safety Measures](#safety-measures)
7. [Real-World Scenarios](#real-world-scenarios)

## Introduction
This document provides comprehensive documentation for the database backup and restore procedures in the Fund Track application. The system implements robust mechanisms for creating PostgreSQL database backups with timestamped filenames and compression, as well as restoring from backup files with pre-restore validation checks and service coordination. The documentation covers the implementation details of the backup-database.sh and disaster-recovery.sh scripts, encryption considerations, storage locations, retention policies, and step-by-step instructions for executing backups, verifying integrity, and performing point-in-time recovery.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)

## Backup Implementation

### backup-database.sh Script Analysis
The backup-database.sh script implements a comprehensive solution for creating automated PostgreSQL database backups in production environments. The script follows a systematic approach to ensure reliable and verifiable backups.

```mermaid
flowchart TD
Start([Start Backup]) --> CheckEnv["Check DATABASE_URL environment variable"]
CheckEnv --> ExtractConfig["Extract database connection details"]
ExtractConfig --> CreateBackup["Create database backup with pg_dump"]
CreateBackup --> UploadCloud["Upload to cloud storage if enabled"]
UploadCloud --> Cleanup["Clean up old backups"]
Cleanup --> Verify["Verify backup integrity"]
Verify --> Notify["Send notification if configured"]
Notify --> End([Backup Completed])
style Start fill:#4CAF50,stroke:#388E3C
style End fill:#4CAF50,stroke:#388E3C
```

**Diagram sources**
- [backup-database.sh](file://scripts/backup-database.sh#L1-L119)

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L1-L119)

### Backup Creation Process
The backup process begins with configuration setup and environment validation:

```bash
# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="merchant_funding_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
```

The script first validates that the DATABASE_URL environment variable is set, then extracts connection details (host, port, database name, user, and password) from the URL using sed commands. The backup is created using pg_dump with the following parameters:
- **--format=custom**: Uses PostgreSQL's custom format for better compression and flexibility
- **--compress=9**: Maximum compression level to minimize storage requirements
- **--verbose**: Provides detailed output for logging and debugging

The backup file is named with a timestamp pattern (merchant_funding_backup_YYYYMMDD_HHMMSS.sql) to ensure uniqueness and facilitate chronological sorting.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L8-L64)

### Backup Verification and Integrity
After creating the backup, the script performs integrity verification to ensure the backup file is valid and can be restored:

```mermaid
flowchart TD
VerifyStart["Verify backup integrity"] --> PgRestore["Execute pg_restore --list"]
PgRestore --> CheckResult["Check command exit status"]
CheckResult --> |Success| LogSuccess["Log: Backup integrity verified"]
CheckResult --> |Failure| LogError["Log: Backup integrity check failed"]
LogError --> ExitFailure["Exit with error code 1"]
style VerifyStart fill:#2196F3,stroke:#1976D2
style LogSuccess fill:#4CAF50,stroke:#388E3C
style LogError fill:#F44336,stroke:#D32F2F
```

**Diagram sources**
- [backup-database.sh](file://scripts/backup-database.sh#L96-L102)

The verification process uses `pg_restore --list` to test the backup file without actually restoring data. This ensures that the backup file is not corrupted and can be successfully read by PostgreSQL tools.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L96-L102)

### Cloud Backup Integration
The script supports optional cloud storage integration for enhanced data protection:

```bash
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
```

This feature allows backups to be stored in cloud storage (currently configured for AWS S3) when ENABLE_CLOUD_BACKUP is set to "true" and BACKUP_STORAGE_BUCKET is specified. This provides geographic redundancy and protection against local storage failures.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L74-L85)

## Disaster Recovery Process

### disaster-recovery.sh Script Analysis
The disaster-recovery.sh script provides a comprehensive solution for restoring the database from backup files with multiple safety features and validation checks.

```mermaid
flowchart TD
MainStart["Main Function"] --> ParseArgs["Parse command line arguments"]
ParseArgs --> ListBackups["--list-backups: Display available backups"]
ParseArgs --> LatestBackup["--latest: Restore from latest backup"]
ParseArgs --> RestoreFrom["--restore-from FILE: Restore from specific file"]
ParseArgs --> VerifyBackup["--verify-backup FILE: Verify backup integrity"]
ParseArgs --> ShowHelp["--help: Display usage information"]
RestoreFrom --> ValidateFile["Validate backup file exists"]
ValidateFile --> VerifyIntegrity["Verify backup integrity"]
VerifyIntegrity --> CreatePreBackup["Create pre-restore backup"]
CreatePreBackup --> ExtractConfig["Extract database connection details"]
ExtractConfig --> RestoreDB["Restore database with pg_restore"]
RestoreDB --> RunMigrations["Run Prisma migrations"]
RestoreDB --> EndSuccess["Log success and completion"]
RestoreDB --> EndFailure["Log failure and preserve pre-restore backup"]
style MainStart fill:#4CAF50,stroke:#388E3C
style EndSuccess fill:#4CAF50,stroke:#388E3C
style EndFailure fill:#F44336,stroke:#D32F2F
```

**Diagram sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L1-L259)

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L1-L259)

### Recovery Workflow
The disaster recovery process follows a systematic approach to minimize risk and ensure data integrity:

1. **Argument parsing**: The script accepts several command-line options:
   - `--list-backups`: Lists all available backup files with their sizes and timestamps
   - `--latest`: Restores from the most recent backup
   - `--restore-from FILE`: Restores from a specific backup file
   - `--verify-backup FILE`: Verifies the integrity of a specific backup file
   - `--help`: Displays usage information

2. **Pre-restore validation**: Before any restoration begins, the script verifies the backup file's integrity using `pg_restore --list`, ensuring the backup is not corrupted.

3. **Pre-restore backup creation**: As a critical safety measure, the script creates a backup of the current database state before proceeding with the restoration. This allows rollback if the restoration process fails or produces unexpected results.

4. **Database restoration**: The actual restoration is performed using pg_restore with the following options:
   - **--clean**: Drops database objects before recreating them
   - **--if-exists**: Only drops objects that already exist
   - **--no-owner**: Prevents restoration of object ownership
   - **--no-privileges**: Prevents restoration of access privileges

5. **Post-restore migration**: After successful restoration, the script runs `npx prisma migrate deploy` to ensure the database schema is up to date with any recent migrations that may have been applied after the backup was created.

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L122-L206)

### Pre-Restore Safety Measures
The script implements a critical safety feature by creating a backup of the current database state before any restoration:

```bash
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
```

This pre-restore backup is named with a timestamp pattern (pre_restore_backup_YYYYMMDD_HHMMSS.sql) and stored in the same backup directory. In case of restoration failure, this backup preserves the original database state, allowing for recovery.

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L91-L120)

## Backup Storage and Retention

### Storage Configuration
Both backup and recovery scripts use configurable storage locations through environment variables:

```bash
# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
```

The BACKUP_DIR environment variable specifies the directory where backup files are stored. If not set, it defaults to "./backups" relative to the script's execution directory. The script automatically creates this directory if it doesn't exist using `mkdir -p "$BACKUP_DIR"`.

Backup files are stored with the naming convention: `merchant_funding_backup_YYYYMMDD_HHMMSS.sql`, where the timestamp ensures uniqueness and facilitates chronological sorting.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L8)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L8)

### Retention Policy
The backup system implements an automated retention policy to manage disk space and maintain an appropriate backup history:

```bash
# Clean up old backups
log "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "merchant_funding_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete
```

The retention policy is controlled by the RETENTION_DAYS environment variable, which defaults to 30 days if not specified. The cleanup process uses the `find` command with the `-mtime` option to identify and delete backup files older than the specified retention period.

After cleanup, the script counts and logs the number of remaining backups to provide visibility into the current backup inventory.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L88-L93)

### Cloud Storage Integration
For enhanced data protection and geographic redundancy, the system supports cloud storage integration:

```bash
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
```

The cloud backup feature is controlled by two environment variables:
- **ENABLE_CLOUD_BACKUP**: When set to "true", enables cloud backup functionality
- **BACKUP_STORAGE_BUCKET**: Specifies the name of the cloud storage bucket

Currently, the implementation is configured for AWS S3, but could be adapted for other cloud providers as needed.

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L74-L85)

## Execution Procedures

### Backup Execution
To execute a database backup, run the backup-database.sh script with appropriate environment variables:

```bash
# Example backup execution
export DATABASE_URL="postgresql://user:password@host:port/database"
export BACKUP_DIR="/path/to/backups"
export RETENTION_DAYS=30
export ENABLE_CLOUD_BACKUP=true
export BACKUP_STORAGE_BUCKET="my-backup-bucket"
export ENABLE_BACKUP_NOTIFICATIONS=true
export ADMIN_EMAIL="admin@example.com"

./scripts/backup-database.sh
```

The script will:
1. Create a timestamped backup file
2. Compress the backup using maximum compression
3. Upload to cloud storage if configured
4. Clean up backups older than the retention period
5. Verify backup integrity
6. Send notification if configured

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh)

### Verification Procedures
The system provides multiple verification mechanisms to ensure backup integrity:

1. **Automatic verification**: After each backup, the script automatically verifies integrity using `pg_restore --list`.

2. **Manual verification**: Use the disaster-recovery.sh script to verify specific backup files:
```bash
./scripts/disaster-recovery.sh --verify-backup ./backups/merchant_funding_backup_20240131_120000.sql
```

3. **Listing available backups**: View all available backups with their metadata:
```bash
./scripts/disaster-recovery.sh --list-backups
```

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh#L96-L102)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L34-L89)

### Point-in-Time Recovery
To perform point-in-time recovery, use the disaster-recovery.sh script with the appropriate options:

```bash
# Restore from the latest backup
./scripts/disaster-recovery.sh --latest

# Restore from a specific backup file
./scripts/disaster-recovery.sh --restore-from ./backups/merchant_funding_backup_20240131_120000.sql
```

The recovery process includes:
1. Pre-restore backup creation for safety
2. Backup integrity verification
3. Database restoration with schema cleanup
4. Prisma migration deployment to ensure schema consistency
5. Comprehensive logging of the entire process

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L122-L206)

## Safety Measures

### Confirmation and Validation
The disaster recovery script implements multiple safety measures to prevent accidental data loss:

1. **Pre-restore backup**: Automatically creates a backup of the current database state before any restoration begins.

2. **Integrity verification**: Validates the backup file integrity before starting the restoration process.

3. **Environment validation**: Checks for required environment variables (DATABASE_URL) before proceeding.

4. **Comprehensive logging**: Maintains detailed logs of all operations in the backup directory.

5. **Error handling**: Uses `set -e` to exit on any error, preventing partial or incomplete operations.

```mermaid
flowchart TD
StartRecovery["Start Recovery Process"] --> CheckEnv["Validate DATABASE_URL"]
CheckEnv --> |Missing| ExitError["Exit with error"]
CheckEnv --> |Valid| VerifyBackup["Verify backup integrity"]
VerifyBackup --> |Invalid| ExitError
VerifyBackup --> |Valid| CreatePreBackup["Create pre-restore backup"]
CreatePreBackup --> |Failed| ExitError
CreatePreBackup --> |Success| RestoreDB["Restore database"]
RestoreDB --> |Failed| PreserveState["Preserve original state"]
RestoreDB --> |Success| RunMigrations["Run Prisma migrations"]
RunMigrations --> EndSuccess["Log success"]
style StartRecovery fill:#2196F3,stroke:#1976D2
style ExitError fill:#F44336,stroke:#D32F2F
style PreserveState fill:#FF9800,stroke:#F57C00
style EndSuccess fill:#4CAF50,stroke:#388E3C
```

**Diagram sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L122-L163)

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L122-L163)

### Rollback Procedures
In case of restoration failure, the system provides built-in rollback capabilities:

1. **Pre-restore backup**: The automatically created pre-restore backup can be used to restore the original database state.

2. **Original state preservation**: The script explicitly logs that the original database state is preserved when restoration fails.

3. **Clear error messages**: Detailed error messages indicate the failure point and provide guidance for recovery.

To perform a rollback using the pre-restore backup:
```bash
# Find the pre-restore backup file
ls -la backups/pre_restore_backup_*.sql

# Restore from the pre-restore backup
./scripts/disaster-recovery.sh --restore-from backups/pre_restore_backup_20240131_120000.sql
```

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh#L198-L200)

## Real-World Scenarios

### Server Migration
When migrating to a new server, follow these steps:

1. **Prepare the new server**: Install PostgreSQL and configure the environment.
2. **Transfer backups**: Copy backup files from the old server to the new server.
3. **Restore database**: Use the disaster-recovery.sh script to restore from the most recent backup.
4. **Verify data**: Check application functionality and data integrity.
5. **Update configuration**: Point the application to the new database server.

```bash
# On the new server
export DATABASE_URL="postgresql://user:password@new-host:port/database"
./scripts/disaster-recovery.sh --restore-from /path/to/backup/merchant_funding_backup_20240131_120000.sql
```

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)

### Data Corruption Recovery
In case of data corruption, follow these recovery steps:

1. **Identify corruption time**: Determine when the corruption occurred.
2. **Select appropriate backup**: Choose a backup from before the corruption.
3. **Perform recovery**: Use the disaster-recovery.sh script to restore from the selected backup.
4. **Verify restoration**: Check that the data is now consistent and correct.

```bash
# List available backups to select appropriate one
./scripts/disaster-recovery.sh --list-backups

# Restore from backup before corruption
./scripts/disaster-recovery.sh --restore-from ./backups/merchant_funding_backup_20240130_120000.sql
```

**Section sources**
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)

### Compliance Audits
For compliance audits, the backup system provides several features:

1. **Audit logging**: Both scripts maintain detailed logs of all backup and recovery operations.
2. **Integrity verification**: Automatic verification ensures backup reliability.
3. **Retention policy**: Configurable retention period meets compliance requirements.
4. **Cloud storage**: Off-site backups provide additional security and redundancy.

To generate audit reports:
```bash
# View backup logs
cat backups/backup.log

# View recovery logs  
cat backups/recovery.log

# List all backups with metadata
./scripts/disaster-recovery.sh --list-backups
```

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)