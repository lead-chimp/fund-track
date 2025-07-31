/**
 * Liveness probe endpoint for Kubernetes/container orchestration
 * This endpoint checks if the application is alive and should not be restarted
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple liveness check - if we can respond, we're alive
    return NextResponse.json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid
    });
    
  } catch (error) {
    // If we can't even respond to this simple check, something is very wrong
    return NextResponse.json(
      { 
        status: 'dead', 
        error: error instanceof Error ? error.message : 'unknown error'
      }, 
      { status: 503 }
    );
  }
}