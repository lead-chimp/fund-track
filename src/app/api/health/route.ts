/**
 * Health check endpoint for monitoring system status
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database-error-handler';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    environment: {
      nodeEnv: string;
      nodeVersion: string;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (!dbHealth.healthy) {
      overallStatus = 'unhealthy';
    } else if (memoryPercentage > 90) {
      overallStatus = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        memory: {
          status: memoryPercentage > 90 ? 'unhealthy' : 'healthy',
          usage: {
            used: Math.round(usedMemory / 1024 / 1024), // MB
            total: Math.round(totalMemory / 1024 / 1024), // MB
            percentage: Math.round(memoryPercentage),
          },
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'unknown',
          nodeVersion: process.version,
        },
      },
    };
    
    const duration = Date.now() - startTime;
    
    // Log health check
    logger.info('Health check completed', {
      status: overallStatus,
      duration,
      dbLatency: dbHealth.latency,
      memoryUsage: memoryPercentage,
    });
    
    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    logger.error('Health check failed', error as Error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: {
          status: 'unhealthy',
          error: 'Health check failed',
        },
        memory: {
          status: 'unhealthy',
          usage: {
            used: 0,
            total: 0,
            percentage: 0,
          },
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'unknown',
          nodeVersion: process.version,
        },
      },
    };
    
    return NextResponse.json(errorStatus, { status: 503 });
  }
}