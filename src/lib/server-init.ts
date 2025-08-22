import { backgroundJobScheduler } from '@/services/BackgroundJobScheduler';
import { notificationService } from '@/services/NotificationService';
import { logger } from '@/lib/logger';

let isInitialized = false;

/**
 * Initialize server-side services
 * This should be called once when the server starts
 */
export function initializeServer(): void {
  if (isInitialized) {
    logger.warn('Server already initialized, skipping...');
    return;
  }

  logger.info('Initializing server services...');

  try {
    // Validate notification service configuration
    const notificationConfigValid = notificationService.validateConfiguration();
    if (!notificationConfigValid) {
      logger.warn('Notification service configuration is invalid. Some features may not work properly.');
    } else {
      logger.info('Notification service configuration validated successfully');
    }

    // Start background job scheduler only in production or when explicitly enabled
    const shouldStartScheduler = process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_BACKGROUND_JOBS === 'true';

    logger.info('Scheduler startup check', {
      nodeEnv: process.env.NODE_ENV,
      enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS,
      shouldStartScheduler,
      currentStatus: backgroundJobScheduler.getStatus().isRunning
    });

    if (shouldStartScheduler) {
      if (!backgroundJobScheduler.getStatus().isRunning) {
        backgroundJobScheduler.start();
        logger.info('Background job scheduler started during server initialization');
      } else {
        logger.info('Background job scheduler already running, skipping start');
      }
    } else {
      logger.info('Background job scheduler disabled (set ENABLE_BACKGROUND_JOBS=true to enable in development)');
    }

    isInitialized = true;
    logger.info('Server initialization completed successfully');

  } catch (error) {
    logger.error('Server initialization failed', { error: error instanceof Error ? error.message : 'Unknown error' });
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

  logger.info('Cleaning up server services...');

  try {
    backgroundJobScheduler.stop();
    logger.info('Background job scheduler stopped');

    isInitialized = false;
    logger.info('Server cleanup completed');

  } catch (error) {
    logger.error('Server cleanup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, cleaning up...');
    cleanupServer();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal, cleaning up...');
    cleanupServer();
    process.exit(0);
  });
}