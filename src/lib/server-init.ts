import { backgroundJobScheduler } from "@/services/BackgroundJobScheduler";
import { notificationService } from "@/services/NotificationService";
import { logger } from "@/lib/logger";

let isInitialized = false;

/**
 * Initialize server-side services
 * This should be called once when the server starts
 */
export function initializeServer(): void {
  if (isInitialized) {
    logger.warn("Server already initialized, skipping...");
    return;
  }

  // Add more verbose logging
  console.log(" initializeServer() called at:", new Date().toISOString());
  console.log("📊 Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_BACKGROUND_JOBS: process.env.ENABLE_BACKGROUND_JOBS,
    TZ: process.env.TZ,
  });

  logger.info("Initializing server services...");

  try {
    // Validate notification service configuration
    console.log("🔧 Validating notification service...");
    const notificationConfigValid = notificationService.validateConfiguration();
    if (!notificationConfigValid) {
      logger.warn(
        "Notification service configuration is invalid. Some features may not work properly."
      );
    } else {
      logger.info("Notification service configuration validated successfully");
    }

    // Start background job scheduler only in production or when explicitly enabled.
    // Set ENABLE_BACKGROUND_JOBS=false to disable even in production (e.g. when using Postgres cron).
    const shouldStartScheduler =
      process.env.ENABLE_BACKGROUND_JOBS !== "false" &&
      (process.env.NODE_ENV === "production" ||
        process.env.ENABLE_BACKGROUND_JOBS === "true");

    console.log("📅 Scheduler startup decision:", {
      nodeEnv: process.env.NODE_ENV,
      enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS,
      shouldStartScheduler,
      currentStatus: backgroundJobScheduler.getStatus().isRunning,
    });

    logger.info("Scheduler startup check", {
      nodeEnv: process.env.NODE_ENV,
      enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS,
      shouldStartScheduler,
      currentStatus: backgroundJobScheduler.getStatus().isRunning,
    });

    if (shouldStartScheduler) {
      console.log("✅ Should start scheduler, checking current status...");
      const currentStatus = backgroundJobScheduler.getStatus();
      console.log("📊 Current scheduler status:", currentStatus);

      if (!currentStatus.isRunning) {
        console.log("🚀 Starting background job scheduler...");
        backgroundJobScheduler.start();
        console.log("✅ Scheduler start() called");
        logger.info(
          "Background job scheduler started during server initialization"
        );
      } else {
        console.log("⚠️ Scheduler already running, skipping start");
        logger.info("Background job scheduler already running, skipping start");
      }
    } else {
      console.log("❌ Scheduler disabled by environment");
      logger.info(
        "Background job scheduler disabled (set ENABLE_BACKGROUND_JOBS=true to enable, or false when using Postgres cron)"
      );
    }

    isInitialized = true;
    console.log("✅ Server initialization completed successfully");
    logger.info("Server initialization completed successfully");
  } catch (error) {
    console.error("❌ Server initialization failed with error:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    logger.error("Server initialization failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw the error to prevent the server from crashing
    // Log it and continue with limited functionality
  }
}

/**
 * Cleanup server resources
 * This should be called when the server is shutting down
 */
export function cleanupServer(): void {
  if (!isInitialized) {
    return;
  }

  logger.info("Cleaning up server services...");

  try {
    backgroundJobScheduler.stop();
    logger.info("Background job scheduler stopped");

    isInitialized = false;
    logger.info("Server cleanup completed");
  } catch (error) {
    logger.error("Server cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Handle process termination signals
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM signal, cleaning up...");
    cleanupServer();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT signal, cleaning up...");
    cleanupServer();
    process.exit(0);
  });
}

// Alternative initialization method that can be called from API routes
export function forceInitializeScheduler(): void {
  const shouldStartScheduler =
    process.env.ENABLE_BACKGROUND_JOBS !== "false" &&
    (process.env.NODE_ENV === "production" ||
      process.env.ENABLE_BACKGROUND_JOBS === "true");

  if (!shouldStartScheduler) {
    logger.info(
      "Skipping force initialization: scheduler disabled (ENABLE_BACKGROUND_JOBS=false or not in production)"
    );
    return;
  }

  console.log(" Force initializing scheduler...");

  try {
    const status = backgroundJobScheduler.getStatus();
    console.log("📊 Current scheduler status:", status);

    if (!status.isRunning) {
      console.log(" Starting scheduler...");
      backgroundJobScheduler.start();

      // Wait a moment and check status
      setTimeout(() => {
        const newStatus = backgroundJobScheduler.getStatus();
        console.log("📊 Scheduler status after start:", newStatus);

        if (newStatus.isRunning) {
          console.log("✅ Scheduler started successfully");
        } else {
          console.log("❌ Scheduler failed to start");
        }
      }, 1000);
    } else {
      console.log("✅ Scheduler is already running");
    }
  } catch (error) {
    console.error("❌ Force initialization failed:", error);
  }
}

// Auto-initialize if this module is imported in production and scheduler is enabled
// Skip when ENABLE_BACKGROUND_JOBS=false (e.g. when using Coolify/Postgres cron)
if (
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  process.env.ENABLE_BACKGROUND_JOBS !== "false"
) {
  console.log("🌍 Production environment detected, auto-initializing scheduler...");

  // Delay initialization to ensure all modules are loaded
  setTimeout(() => {
    console.log("⏰ Auto-initializing scheduler...");
    forceInitializeScheduler();
  }, 2000);
}
