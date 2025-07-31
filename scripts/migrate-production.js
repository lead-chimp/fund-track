#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Handles safe database migrations with rollback capabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = './backups';
const LOG_FILE = './logs/migration.log';

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
}

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    console.log(message);
    fs.appendFileSync(LOG_FILE, logMessage);
}

// Execute command with logging
function executeCommand(command, description) {
    log(`Executing: ${description}`);
    log(`Command: ${command}`);

    try {
        const output = execSync(command, { encoding: 'utf8' });
        log(`Success: ${description}`);
        if (output) {
            log(`Output: ${output}`);
        }
        return output;
    } catch (error) {
        log(`Error: ${description} failed`);
        log(`Error details: ${error.message}`);
        throw error;
    }
}

// Check database connection
function checkDatabaseConnection() {
    log('Checking database connection...');

    try {
        executeCommand('npx prisma db execute --stdin < /dev/null', 'Database connection test');
        log('✅ Database connection successful');
        return true;
    } catch (error) {
        log('❌ Database connection failed');
        return false;
    }
}

// Create database backup
function createBackup() {
    log('Creating database backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

    try {
        // Get database URL components
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable not set');
        }

        // Extract connection details from DATABASE_URL
        const url = new URL(databaseUrl);
        const host = url.hostname;
        const port = url.port || 5432;
        const database = url.pathname.slice(1);
        const username = url.username;
        const password = url.password;

        // Set PGPASSWORD environment variable for pg_dump
        process.env.PGPASSWORD = password;

        const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password > ${backupFile}`;
        executeCommand(dumpCommand, 'Database backup');

        log(`✅ Backup created: ${backupFile}`);
        return backupFile;
    } catch (error) {
        log(`❌ Backup failed: ${error.message}`);
        throw error;
    }
}

// Run Prisma migrations
function runMigrations() {
    log('Running Prisma migrations...');

    try {
        // Generate Prisma client
        executeCommand('npx prisma generate', 'Prisma client generation');

        // Deploy migrations
        executeCommand('npx prisma migrate deploy', 'Prisma migration deployment');

        log('✅ Migrations completed successfully');
    } catch (error) {
        log(`❌ Migration failed: ${error.message}`);
        throw error;
    }
}

// Verify migration success
function verifyMigration() {
    log('Verifying migration success...');

    try {
        // Check if we can connect and query the database
        executeCommand('npx prisma db execute --stdin <<< "SELECT 1;"', 'Migration verification');
        log('✅ Migration verification successful');
    } catch (error) {
        log(`❌ Migration verification failed: ${error.message}`);
        throw error;
    }
}

// Rollback function (if needed)
function rollback(backupFile) {
    log(`Rolling back to backup: ${backupFile}`);

    try {
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }

        // Get database URL components
        const databaseUrl = process.env.DATABASE_URL;
        const url = new URL(databaseUrl);
        const host = url.hostname;
        const port = url.port || 5432;
        const database = url.pathname.slice(1);
        const username = url.username;
        const password = url.password;

        // Set PGPASSWORD environment variable
        process.env.PGPASSWORD = password;

        // Drop and recreate database (be very careful with this!)
        const restoreCommand = `psql -h ${host} -p ${port} -U ${username} -d ${database} < ${backupFile}`;
        executeCommand(restoreCommand, 'Database rollback');

        log('✅ Rollback completed');
    } catch (error) {
        log(`❌ Rollback failed: ${error.message}`);
        throw error;
    }
}

// Main migration function
async function main() {
    log('🚀 Starting production database migration');
    log('==========================================');

    let backupFile = null;

    try {
        // Check environment
        if (process.env.NODE_ENV !== 'production') {
            log('⚠️  Warning: Not running in production environment');
        }

        // Check database connection
        if (!checkDatabaseConnection()) {
            throw new Error('Cannot connect to database');
        }

        // Create backup
        backupFile = createBackup();

        // Run migrations
        runMigrations();

        // Verify migration
        verifyMigration();

        log('🎉 Migration completed successfully!');

    } catch (error) {
        log(`💥 Migration failed: ${error.message}`);

        if (backupFile && process.argv.includes('--auto-rollback')) {
            log('🔄 Attempting automatic rollback...');
            try {
                rollback(backupFile);
                log('✅ Rollback completed');
            } catch (rollbackError) {
                log(`❌ Rollback also failed: ${rollbackError.message}`);
                log('🚨 Manual intervention required!');
            }
        } else {
            log('💡 To rollback manually, run:');
            log(`   node scripts/migrate-production.js --rollback ${backupFile}`);
        }

        process.exit(1);
    }
}

// Handle command line arguments
if (process.argv.includes('--rollback')) {
    const backupFile = process.argv[process.argv.indexOf('--rollback') + 1];
    if (!backupFile) {
        console.error('Please specify backup file for rollback');
        process.exit(1);
    }
    rollback(backupFile);
} else {
    main();
}