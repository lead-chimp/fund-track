'use client';

import { useState } from 'react';

interface ConnectivityStatus {
  status: 'connected' | 'disconnected' | 'failed' | 'error';
  error?: string;
  details: {
    responseTime?: string;
    serverInfo?: any;
    connectionStatus?: string;
    error?: string;
  };
  timestamp: string;
  config: {
    server: string;
    database: string;
    port: string;
    encrypt: string;
    trustServerCertificate: string;
  };
}

export function ConnectivityCheck() {
  const [status, setStatus] = useState<ConnectivityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkLegacyDbConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/connectivity/legacy-db', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check connectivity');
      }
      
      setStatus(data);
    } catch (error) {
      setStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { connectionStatus: 'Error' },
        timestamp: new Date().toISOString(),
        config: {
          server: 'Unknown',
          database: 'Unknown',
          port: 'Unknown',
          encrypt: 'Unknown',
          trustServerCertificate: 'Unknown'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'connected':
        return <span className="text-green-500 text-xl">✅</span>;
      case 'failed':
      case 'error':
        return <span className="text-red-500 text-xl">❌</span>;
      default:
        return <span className="text-yellow-500 text-xl">⚠️</span>;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'gray';
    
    switch (status.status) {
      case 'connected':
        return 'green';
      case 'failed':
      case 'error':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getStatusText = () => {
    if (!status) return 'Not tested';
    
    switch (status.status) {
      case 'connected':
        return 'Connected';
      case 'failed':
        return 'Connection Failed';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Legacy Database Connectivity
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Check the connection status to the legacy MS SQL Server database.</p>
            </div>
          </div>
          <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
            <button
              type="button"
              onClick={checkLegacyDbConnection}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>
        </div>

        {status && (
          <div className="mt-6">
            <div className="border rounded-lg p-4">
              {/* Status Header */}
              <div className="flex items-center mb-4">
                {getStatusIcon()}
                <span className={`ml-2 text-sm font-medium text-${getStatusColor()}-600`}>
                  {getStatusText()}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {new Date(status.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Error Message */}
              {status.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{status.error}</p>
                </div>
              )}

              {/* Connection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Connection Details</h4>
                  <dl className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <dt>Status:</dt>
                      <dd className={`font-medium text-${getStatusColor()}-600`}>
                        {status.details.connectionStatus || 'Unknown'}
                      </dd>
                    </div>
                    {status.details.responseTime && (
                      <div className="flex justify-between">
                        <dt>Response Time:</dt>
                        <dd>{status.details.responseTime}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
                  <dl className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <dt>Server:</dt>
                      <dd className="font-mono text-xs">{status.config.server}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Database:</dt>
                      <dd className="font-mono text-xs">{status.config.database}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Port:</dt>
                      <dd className="font-mono text-xs">{status.config.port}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Server Info */}
              {status.details.serverInfo && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Server Information</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <dl className="text-xs text-gray-600 space-y-1">
                      {status.details.serverInfo.server_name && (
                        <div className="flex justify-between">
                          <dt>Server Name:</dt>
                          <dd className="font-mono">{status.details.serverInfo.server_name}</dd>
                        </div>
                      )}
                      {status.details.serverInfo.database_name && (
                        <div className="flex justify-between">
                          <dt>Database Name:</dt>
                          <dd className="font-mono">{status.details.serverInfo.database_name}</dd>
                        </div>
                      )}
                      {status.details.serverInfo.version && (
                        <div className="mt-2">
                          <dt className="font-medium">Version:</dt>
                          <dd className="font-mono text-xs mt-1 break-all">
                            {status.details.serverInfo.version}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}