/**
 * Monitoring system status endpoint
 */

import { NextResponse } from 'next/server';
import { 
  getMonitoringStatus, 
  testConnectivity, 
  getPerformanceMetrics, 
  getErrorMetrics,
  withPerformanceMonitoring 
} from '@/lib/monitoring';
import { logger } from '@/lib/logger';

async function monitoringStatusHandler() {
  try {
    // Get basic monitoring status
    const status = getMonitoringStatus();
    
    // Test connectivity (local logging only)
    const connectivityTest = await testConnectivity();
    
    // Get metrics summaries
    const performanceMetrics = getPerformanceMetrics();
    const errorMetrics = getErrorMetrics();
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      monitoring: {
        ...status,
        logging: {
          enabled: connectivityTest.canSendEvents,
          error: connectivityTest.error,
        },
      },
      metrics: {
        performance: {
          totalOperations: Object.keys(performanceMetrics).length,
          operations: performanceMetrics,
        },
        errors: {
          totalErrorTypes: Object.keys(errorMetrics).length,
          errors: errorMetrics,
        },
      },
    };
    
    logger.info('Monitoring status check completed', {
      loggingWorking: connectivityTest.canSendEvents,
      metricsCount: Object.keys(performanceMetrics).length,
      errorTypesCount: Object.keys(errorMetrics).length,
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Monitoring status check failed', error as Error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Export the wrapped handler with performance monitoring
export const GET = withPerformanceMonitoring('monitoring_status', monitoringStatusHandler);