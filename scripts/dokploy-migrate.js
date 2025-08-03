#!/usr/bin/env node

/**
 * Dokploy Deployment Migration Script
 * Simplified for Railpack/Dokploy deployment without Docker
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const LOG_FILE = "./logs/dokploy-migrate.log";
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Ensure logs directory exists
if (!fs.existsSync("./logs")) {
  fs.mkdirSync("./logs", { recursive: true });
}

// Logging function
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

// Execute command with retry logic
async function executeWithRetry(
  command,
  description,
  retries = RETRY_ATTEMPTS
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log(`Executing: ${description} (attempt ${attempt}/${retries})`);

      const output = execSync(command, {
        encoding: "utf8",
        timeout: 60000, // 60 second timeout
        stdio: ["inherit", "pipe", "pipe"],
      });

      log(`✅ Success: ${description}`);
      if (output && output.trim()) {
        log(`Output: ${output.trim()}`);
      }
      return output;
    } catch (error) {
      log(`❌ Attempt ${attempt} failed: ${description}`, "ERROR");
      log(`Error: ${error.message}`, "ERROR");

      if (attempt < retries) {
        log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

// Check if database is ready
async function waitForDatabase() {
  log("🔍 Checking database connectivity...");

  const maxWaitTime = 120000; // 2 minutes
  const checkInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      await executeWithRetry(
        'npx prisma db execute --stdin <<< "SELECT 1;"',
        "Database connectivity check",
        1
      );
      log("✅ Database is ready");
      return true;
    } catch (error) {
      log("⏳ Database not ready yet, waiting...");
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }

  throw new Error(
    "Database did not become available within the timeout period"
  );
}

// Generate Prisma client
async function generatePrismaClient() {
  log("🔧 Generating Prisma client...");
  await executeWithRetry("npx prisma generate", "Prisma client generation");
}

// Deploy migrations
async function deployMigrations() {
  log("🚀 Deploying database migrations...");
  await executeWithRetry(
    "npx prisma migrate deploy",
    "Database migration deployment"
  );
}

// Run database seeding
async function seedDatabase() {
  log("🌱 Checking if database seeding is required...");

  // Check if we should seed (usually only on first deployment or when explicitly requested)
  const shouldSeed =
    process.env.FORCE_SEED === "true" || process.argv.includes("--seed");

  if (!shouldSeed) {
    log(
      "ℹ️ Skipping seed (set FORCE_SEED=true environment variable to enable seeding)"
    );
    return;
  }

  try {
    await executeWithRetry("npx tsx prisma/seed.ts", "Database seeding");
    log("✅ Database seeded successfully");
  } catch (error) {
    // Seeding failures shouldn't break deployment, just log the error
    log("⚠️ Database seeding failed, but continuing deployment", "WARN");
    log(`Seed error: ${error.message}`, "WARN");
  }
}

// Verify deployment
async function verifyDeployment() {
  log("✅ Verifying deployment...");

  try {
    // Test database connection with a simple query
    await executeWithRetry(
      'npx prisma db execute --stdin <<< "SELECT 1 as test;"',
      "Database verification",
      1
    );

    log("✅ Deployment verification successful");
  } catch (error) {
    log("⚠️ Deployment verification had issues but continuing", "WARN");
    log(`Verification error: ${error.message}`, "WARN");
  }
}

// Main deployment function
async function main() {
  log("🚀 Starting Dokploy postDeploy migration process");
  log("=".repeat(60));

  try {
    // Skip migrations if explicitly disabled (emergency flag)
    if (process.env.SKIP_MIGRATION_CHECK === "true") {
      log("⚠️ SKIP_MIGRATION_CHECK is enabled - skipping all migration steps");
      log("ℹ️ PostDeploy hook completed without running migrations");
      return;
    }

    // Wait for database to be available
    await waitForDatabase();

    // Generate Prisma client (ensuring it's compatible with current schema)
    await generatePrismaClient();

    // Deploy migrations
    await deployMigrations();

    // Seed database if requested
    await seedDatabase();

    // Verify deployment
    await verifyDeployment();

    log("🎉 Dokploy postDeploy migration completed successfully!");
    log("ℹ️ Application is now ready with updated database schema");
    log("=".repeat(60));
  } catch (error) {
    log(`💥 PostDeploy migration failed: ${error.message}`, "ERROR");
    log("🚨 This will cause the deployment to fail", "ERROR");
    log("=".repeat(60));

    // For postDeploy hooks, we need to fail the deployment on critical migration errors
    // Only allow seeding failures to pass
    if (error.message.includes("seeding") || error.message.includes("seed")) {
      log("ℹ️ Only seeding failed - deployment can continue");
      process.exit(0);
    }

    log("💡 Troubleshooting steps:");
    log("   1. Check DATABASE_URL environment variable");
    log("   2. Verify database server is accessible");
    log("   3. Check migration files exist in prisma/migrations/");
    log("   4. Review logs: cat ./logs/dokploy-migrate.log");
    log("   5. Manual migration: npx prisma migrate deploy");
    log("   6. Check Dokploy deployment logs for hook execution");

    // Exit with error code to fail the deployment if migrations fail
    process.exit(1);
  }
}

// Handle different execution modes
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { main, waitForDatabase, deployMigrations, seedDatabase };
