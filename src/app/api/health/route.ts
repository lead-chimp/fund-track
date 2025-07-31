/**
 * Enhanced health check endpoint for production monitoring
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
      connectionPool?: {
        active: number;
        idle: number;
        total: number;
      };
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        used: number;
        total: number;
        percentage: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
    };
    disk: {
      status: 'healthy' | 'unhealthy';
      usage?: {
        free: number;
        total: number;
        percentage: number;
      };
    };
    externalServices: {
      twilio: {
        status: 'healthy' | 'unhealthy' | 'unknown';
        latency?: number;
      };
      mailgun: {
        status: 'healthy' | 'unhealthy' | 'unknown';
      };
      backblaze: {
        status: 'healthy' | 'unhealthy' | 'unknown';
      };
    };
    environment: {
      nodeEnv: string;
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  };
}

// Check disk usage (Node.js doesn't have built-in disk usage, so we'll use a simple check)
async function checkDiskUsage() {
  try {
    const fs = await import('fs/promises');
    const stats = await fs.statfs('./');
    const free = stats.free;
    const total = stats.size;
    const used = total - free;
    const percentage = (used / total) * 100;
    
    return {
      status: percentage > 90 ? 'unhealthy' : 'healthy' as const,
      usage: {
        free: Math.round(free / 1024 / 1024 / 1024), // GB
        total: Math.round(total / 1024 / 1024 / 1024), // GB
        percentage: Math.round(percentage),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: 'Unable to check disk usage',
    };
  }
}

// Check external services (simplified checks)
async function checkExternalServices() {
  const services = {
    twilio: { status: 'unknown' as const },
    mailgun: { status: 'unknown' as const },
    backblaze: { status: 'unknown' as const },
  };

  // Only perform detailed checks if enabled
  if (process.env.ENABLE_DETAILED_HEALTH_CHECKS === 'true') {
    // Twilio check
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const startTime = Date.now();
        // Simple API call to check Twilio status
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        services.twilio = {
          status: response.ok ? 'healthy' : 'unhealthy',
          latency: Date.now() - startTime,
        };
      }
    } catch (error) {
      services.twilio = { status: 'unhealthy' };
    }

    // MailGun check (simplified)
    try {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        services.mailgun = { status: 'healthy' }; // Assume healthy if configured
      }
    } catch (error) {
      services.mailgun = { status: 'unhealthy' };
    }

    // Backblaze check (simplified)
    try {
      if (process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY) {
        services.backblaze = { status: 'healthy' }; // Assume healthy if configured
      }
    } catch (error) {
      services.backblaze = { status: 'unhealthy' };
    }
  }

  return services;
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
    
    // Check disk usage
    const diskHealth = await checkDiskUsage();
    
    // Check external services
    const externalServices = await checkExternalServices();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (!dbHealth.healthy || diskHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (memoryPercentage > 90 || (diskHealth.usage && diskHealth.usage.percentage > 90)) {
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
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
          },
        },
        disk: diskHealth,
        externalServices,
        environment: {
          nodeEnv: process.env.NODE_ENV || 'unknown',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    };
    
    const duration = Date.now() - startTime;
    
    // Log health check (less verbose in production)
    if (process.env.NODE_ENV !== 'production' || overallStatus !== 'healthy') {
      logger.info('Health check completed', {
        status: overallStatus,
        duration,
        dbLatency: dbHealth.latency,
        memoryUsage: memoryPercentage,
        diskUsage: diskHealth.usage?.percentage,
      });
    }
    
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
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
          },
        },
        disk: {
          status: 'unhealthy',
        },
        externalServices: {
          twilio: { status: 'unknown' },
          mailgun: { status: 'unknown' },
          backblaze: { status: 'unknown' },
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'unknown',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    };
    
    return NextResponse.json(errorStatus, { status: 503 });
  }
}