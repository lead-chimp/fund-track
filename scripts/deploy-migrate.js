#!/usr/bin/env node

/**
 * Automated Migration and Seeding Script for Dokploy Deployments
 * Runs after deployment to ensure database is up-to-date
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const LOG_FILE = "./logs/deploy-migrate.log";
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
  log("🌱 Seeding database...");

  // Check if we should seed (usually only on first deployment or when explicitly requested)
  const shouldSeed =
    process.env.FORCE_SEED === "true" || process.argv.includes("--seed");

  if (!shouldSeed) {
    log(
      "ℹ️ Skipping seed (set FORCE_SEED=true or use --seed flag to force seeding)"
    );
    return;
  }

  try {
    await executeWithRetry("npm run db:seed", "Database seeding");
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
    // Test database connection
    await executeWithRetry(
      'npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM User LIMIT 1;"',
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
  log("🚀 Starting automated deployment migration and seeding");
  log("=".repeat(60));

  try {
    // Wait for database to be available
    await waitForDatabase();

    // Generate Prisma client
    await generatePrismaClient();

    // Deploy migrations
    await deployMigrations();

    // Seed database if requested
    await seedDatabase();

    // Verify deployment
    await verifyDeployment();

    log("🎉 Deployment migration and seeding completed successfully!");
    log("=".repeat(60));
  } catch (error) {
    log(`💥 Deployment migration failed: ${error.message}`, "ERROR");
    log("=".repeat(60));

    // Don't exit with error code for non-critical failures
    if (error.message.includes("seeding")) {
      log("ℹ️ Seeding failed but deployment can continue");
      process.exit(0);
    }

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
