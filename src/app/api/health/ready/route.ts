/**
 * Readiness probe endpoint for Kubernetes/container orchestration
 * This endpoint checks if the application is ready to serve traffic
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database-error-handler';

export async function GET() {
  try {
    // Check if database is accessible
    const dbHealth = await checkDatabaseHealth();
    
    if (!dbHealth.healthy) {
      return NextResponse.json(
        { 
          status: 'not ready', 
          reason: 'database not accessible',
          error: dbHealth.error 
        }, 
        { status: 503 }
      );
    }
    
    // Check if required environment variables are set
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        return NextResponse.json(
          { 
            status: 'not ready', 
            reason: `missing required environment variable: ${envVar}` 
          }, 
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json({ 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'not ready', 
        reason: 'readiness check failed',
        error: error instanceof Error ? error.message : 'unknown error'
      }, 
      { status: 503 }
    );
  }
}