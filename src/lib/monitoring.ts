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
  metadata?: Record<string, any>;
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: PerformanceMetric) {
  const { name, duration, timestamp, metadata } = metric;
  
  // Update metrics store
  const existing = metricsStore.get(name);
  if (existing) {
    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.lastUpdated = timestamp;
  } else {
    metricsStore.set(name, {
      count: 1,
      totalTime: duration,
      minTime: duration,
      maxTime: duration,
      lastUpdated: timestamp,
    });
  }
  
  // Log performance metric
  logger.info('Performance metric', {
    metric: name,
    duration,
    metadata,
  });
  
  // Alert on slow operations
  if (duration > 5000) { // 5 seconds
    logger.warn('Slow operation detected', {
      metric: name,
      duration,
      metadata,
    });
  }
}

/**
 * Track errors
 */
export function trackError(errorMetric: ErrorMetric) {
  const { name, error, timestamp, metadata } = errorMetric;
  
  // Update error store
  const existing = errorStore.get(name);
  if (existing) {
    existing.count++;
    existing.lastOccurred = timestamp;
    existing.lastError = error.message;
  } else {
    errorStore.set(name, {
      count: 1,
      lastOccurred: timestamp,
      lastError: error.message,
    });
  }
  
  // Log error
  logger.error('Error tracked', error, {
    errorName: name,
    metadata,
  });
  
  // Send to external error tracking service if configured
  if (process.env.ENABLE_ERROR_REPORTING === 'true' && process.env.ERROR_REPORTING_DSN) {
    sendToErrorTrackingService(errorMetric);
  }
}

/**
 * Send error to external tracking service (e.g., Sentry)
 */
async function sendToErrorTrackingService(errorMetric: ErrorMetric) {
  try {
    // This is a placeholder for Sentry or similar service integration
    // In a real implementation, you would use the Sentry SDK
    
    const payload = {
      message: errorMetric.error.message,
      level: 'error',
      timestamp: errorMetric.timestamp,
      extra: errorMetric.metadata,
      tags: {
        errorName: errorMetric.name,
        environment: process.env.NODE_ENV,
      },
    };
    
    // Example HTTP request to error tracking service
    if (process.env.ERROR_REPORTING_DSN) {
      await fetch(process.env.ERROR_REPORTING_DSN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    logger.error('Failed to send error to tracking service', error as Error);
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  const metrics: Record<string, any> = {};
  
  Array.from(metricsStore.entries()).forEach(([name, data]) => {
    metrics[name] = {
      count: data.count,
      averageTime: Math.round(data.totalTime / data.count),
      minTime: data.minTime,
      maxTime: data.maxTime,
      lastUpdated: new Date(data.lastUpdated).toISOString(),
    };
  });
  
  return metrics;
}

/**
 * Get error metrics summary
 */
export function getErrorMetrics() {
  const errors: Record<string, any> = {};
  
  Array.from(errorStore.entries()).forEach(([name, data]) => {
    errors[name] = {
      count: data.count,
      lastOccurred: new Date(data.lastOccurred).toISOString(),
      lastError: data.lastError,
    };
  });
  
  return errors;
}

/**
 * Performance monitoring middleware for API routes
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  name: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    
    try {
      const result = await handler(...args);
      
      const duration = Date.now() - startTime;
      trackPerformance({
        name,
        duration,
        timestamp: Date.now(),
        metadata: {
          success: true,
        },
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      trackPerformance({
        name,
        duration,
        timestamp: Date.now(),
        metadata: {
          success: false,
        },
      });
      
      trackError({
        name: `${name}_error`,
        error: error as Error,
        timestamp: Date.now(),
      });
      
      throw error;
    }
  }) as T;
}

/**
 * Clean up old metrics (call periodically)
 */
export function cleanupMetrics() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  // Clean up performance metrics
  Array.from(metricsStore.entries()).forEach(([name, data]) => {
    if (now - data.lastUpdated > maxAge) {
      metricsStore.delete(name);
    }
  });
  
  // Clean up error metrics
  Array.from(errorStore.entries()).forEach(([name, data]) => {
    if (now - data.lastOccurred > maxAge) {
      errorStore.delete(name);
    }
  });
  
  logger.info('Metrics cleanup completed', {
    performanceMetrics: metricsStore.size,
    errorMetrics: errorStore.size,
  });
}

// Schedule periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMetrics, 60 * 60 * 1000); // Every hour
}