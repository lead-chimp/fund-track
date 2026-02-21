import { notificationService } from "@/services/NotificationService";

/**
 * Next.js instrumentation for server startup initialization
 * This runs once when the Next.js server starts, before handling requests
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  console.log(
    "[Server Init] Next.js instrumentation running at:",
    new Date().toISOString(),
  );
  console.log("[Server Init] Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    TZ: process.env.TZ,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
  });

  try {
    // Validate notification service configuration
    console.log("[Server Init] Validating notification service...");
    const notificationConfigValid =
      await notificationService.validateConfiguration();

    if (!notificationConfigValid) {
      console.log(
        "[Server Init] Notification service configuration validation failed",
      );
    } else {
      console.log(
        "[Server Init] Notification service configuration validated successfully",
      );
    }

    console.log("[Server Init] Server initialization completed successfully");
  } catch (error) {
    console.error("❌ Server initialization failed with error:", error);
    // Don't throw the error to prevent the server from crashing
    // Log it and continue with limited functionality
  }
}
