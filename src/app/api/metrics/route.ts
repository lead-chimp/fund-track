/**
 * Metrics endpoint for monitoring and observability
 * This endpoint provides application metrics in a format suitable for monitoring systems
 */

import { NextResponse } from 'next/server';
import { getPerformanceMetrics, getErrorMetrics } from '@/lib/monitoring';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    // Only allow access in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to add authentication or IP whitelisting
      const authHeader = new Headers(request.headers).get('authorization');
      if (!authHeader || authHeader !== `Bearer ${process.env.METRICS_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const performanceMetrics = getPerformanceMetrics();
    const errorMetrics = getErrorMetrics();
    
    // System metrics
    const memUsage = process.memoryUsage();
    const systemMetrics = {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
    
    const metrics = {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      performance: performanceMetrics,
      errors: errorMetrics,
    };
    
    return NextResponse.json(metrics);
    
  } catch (error) {
    logger.error('Failed to generate metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' }, 
      { status: 500 }
    );
  }
}