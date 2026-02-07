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

  console.log(" initializeServer() called at:", new Date().toISOString());
  console.log("📊 Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
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
