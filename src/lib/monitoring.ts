/**
 * Performance monitoring and error tracking utilities
 */

import { logger } from './logger';

// Performance metrics store (in production, use Redis or similar)
const metricsStore = new Map<string, {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: number;
}>();

// Error tracking store
const errorStore = new Map<string, {
  count: number;
  lastOccurred: number;
  lastError: string;
}>();

// Types
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  name: string;
  error: Error;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: PerformanceMetric) {
  const existing = metricsStore.get(metric.name) || {
    count: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
    lastUpdated: 0,
  };

  existing.count++;
  existing.totalTime += metric.duration;
  existing.minTime = Math.min(existing.minTime, metric.duration);
  existing.maxTime = Math.max(existing.maxTime, metric.duration);
  existing.lastUpdated = metric.timestamp;

  metricsStore.set(metric.name, existing);

  // Log performance data
  logger.info('Performance metric tracked', {
    name: metric.name,
    duration: metric.duration,
    metadata: metric.metadata,
  });

  // Log slow operations
  if (metric.duration > 5000) { // 5 seconds
    logger.warn('Slow operation detected', {
      name: metric.name,
      duration: metric.duration,
      metadata: metric.metadata,
    });
  }
}

/**
 * Track errors
 */
export function trackError(errorMetric: ErrorMetric) {
  const existing = errorStore.get(errorMetric.name) || {
    count: 0,
    lastOccurred: 0,
    lastError: '',
  };

  existing.count++;
  existing.lastOccurred = errorMetric.timestamp;
  existing.lastError = errorMetric.error.message;

  errorStore.set(errorMetric.name, existing);

  // Log error details
  logger.error('Error tracked', {
    name: errorMetric.name,
    message: errorMetric.error.message,
    stack: errorMetric.error.stack,
    context: errorMetric.context,
    userId: errorMetric.userId,
    userAgent: errorMetric.userAgent,
    url: errorMetric.url,
  });
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics(): Record<string, {
  count: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: number;
}> {
  const result: Record<string, any> = {};
  
  for (const [name, metric] of metricsStore.entries()) {
    result[name] = {
      count: metric.count,
      averageTime: metric.totalTime / metric.count,
      minTime: metric.minTime === Infinity ? 0 : metric.minTime,
      maxTime: metric.maxTime,
      lastUpdated: metric.lastUpdated,
    };
  }
  
  return result;
}

/**
 * Get error metrics summary
 */
export function getErrorMetrics(): Record<string, {
  count: number;
  lastOccurred: number;
  lastError: string;
}> {
  const result: Record<string, any> = {};
  
  for (const [name, error] of errorStore.entries()) {
    result[name] = {
      count: error.count,
      lastOccurred: error.lastOccurred,
      lastError: error.lastError,
    };
  }
  
  return result;
}

/**
 * Clear metrics (useful for testing)
 */
export function clearMetrics() {
  metricsStore.clear();
  errorStore.clear();
}

/**
 * Middleware for API route performance monitoring
 */
export function withPerformanceMonitoring<T extends any[], R>(
  name: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await handler(...args);
      
      // Track successful operation
      trackPerformance({
        name,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { success: true },
      });
      
      return result;
    } catch (error) {
      // Track failed operation
      trackPerformance({
        name,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: { success: false },
      });
      
      // Track the error
      trackError({
        name: `${name}_error`,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
        context: { operationName: name },
      });
      
      throw error;
    }
  };
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus() {
  return {
    errorReportingEnabled: false, // Sentry removed
    environment: process.env.NODE_ENV || 'development',
    metricsStoreSize: metricsStore.size,
    errorStoreSize: errorStore.size,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

/**
 * Test connectivity (simplified without Sentry)
 */
export async function testConnectivity(): Promise<{
  isEnabled: boolean;
  canSendEvents: boolean;
  error?: string;
}> {
  const result = {
    isEnabled: false, // No external error reporting
    canSendEvents: false,
    error: undefined as string | undefined,
  };

  try {
    // Test basic logging functionality
    logger.info('Connectivity test completed - using local logging only');
    result.canSendEvents = true; // Local logging works
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Connectivity test failed', { error: result.error });
  }

  return result;
}

// Legacy function names for backward compatibility (now just log locally)
export function setSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  // Just log user context locally
  logger.info('User context set', { userId: user.id, email: user.email, role: user.role });
}

export function setSentryContext(key: string, context: Record<string, any>) {
  // Just log context locally
  logger.info('Context set', { key, context });
}

export function addSentryBreadcrumb(message: string, data?: Record<string, any>, level: 'info' | 'warning' | 'error' = 'info') {
  // Just log breadcrumb locally
  logger[level]('Breadcrumb', { message, data });
}

export function captureSentryMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  // Just log message locally
  logger[level]('Captured message', { message });
}

export function startSentrySpan(name: string, op: string = 'custom') {
  // Just log span start locally
  logger.info('Span started', { name, op });
  return null;
}

// Alias for backward compatibility
export const testSentryConnectivity = testConnectivity;