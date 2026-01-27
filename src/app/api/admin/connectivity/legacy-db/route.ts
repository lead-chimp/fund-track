import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";

import { getLegacyDatabase } from '@/lib/legacy-db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const legacyDb = getLegacyDatabase();
    
    const startTime = Date.now();
    let status = 'disconnected';
    let error = null;
    let details = {};

    try {
      // Test connection
      const isConnected = await legacyDb.testConnection();
      const responseTime = Date.now() - startTime;

      if (isConnected) {
        status = 'connected';
        
        // Get additional connection details
        try {
          const testQuery = await legacyDb.query('SELECT @@VERSION as version, DB_NAME() as database_name, @@SERVERNAME as server_name');
          details = {
            responseTime: `${responseTime}ms`,
            serverInfo: testQuery[0] || {},
            connectionStatus: legacyDb.isConnected() ? 'Active' : 'Inactive'
          };
        } catch (detailError) {
          details = {
            responseTime: `${responseTime}ms`,
            connectionStatus: 'Connected but query failed',
            error: detailError instanceof Error ? detailError.message : 'Unknown error'
          };
        }
      } else {
        status = 'failed';
        error = 'Connection test failed';
        details = {
          responseTime: `${responseTime}ms`,
          connectionStatus: 'Failed'
        };
      }
    } catch (connectionError) {
      status = 'error';
      error = connectionError instanceof Error ? connectionError.message : 'Unknown connection error';
      details = {
        responseTime: `${Date.now() - startTime}ms`,
        connectionStatus: 'Error'
      };
    }

    return NextResponse.json({
      status,
      error,
      details,
      timestamp: new Date().toISOString(),
      config: {
        server: process.env.LEGACY_DB_SERVER || 'Not configured',
        database: process.env.LEGACY_DB_DATABASE || 'Not configured',
        port: process.env.LEGACY_DB_PORT || '1433',
        encrypt: process.env.LEGACY_DB_ENCRYPT || 'true',
        trustServerCertificate: process.env.LEGACY_DB_TRUST_CERT || 'true'
      }
    });

  } catch (error) {
    console.error('Legacy DB connectivity check failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}