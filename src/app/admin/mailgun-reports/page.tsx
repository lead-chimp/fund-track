'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import PageLoading from '@/components/PageLoading';

interface MailGunEvent {
  id: string;
  timestamp: number;
  event: string;
  recipient: string;
  message?: {
    headers: {
      'message-id': string;
      subject: string;
    };
  };
  'delivery-status'?: {
    message: string;
    code: number;
  };
  reason?: string;
  severity?: string;
  tags?: string[];
}

interface DeliveryReportsResponse {
  success: boolean;
  data: {
    items: MailGunEvent[];
    paging: {
      first: string;
      last: string;
      next: string;
      previous: string;
    };
  };
  query: any;
  debug?: {
    requestTime: string;
    itemCount: number;
    dateRange: {
      begin: string | null;
      end: string | null;
    };
  };
  error?: string;
  details?: string;
}

export default function MailGunReportsPage() {
  const { data: session, status } = useSession();

  // Check if user is admin first
  if (status === 'loading') {
    return <PageLoading message="Loading..." />;
  }

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SYSTEM_ADMIN)) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
          <p className="text-red-600">You must be a system administrator to access this page.</p>
        </div>
      </div>
    );
  }

  // Main component content
  return <MailGunReportsContent />;
}

function MailGunReportsContent() {
  const [reports, setReports] = useState<MailGunEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReports, setFilteredReports] = useState<MailGunEvent[]>([]);
  const [deduplicationMode] = useState<'none' | 'final-status' | 'latest-per-email'>('none');
  const [debugInfo, setDebugInfo] = useState<any>(null);


  const [filters, setFilters] = useState({
    event: '',
    begin: '',
    end: '',
  });

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.event) params.append('event', filters.event);
      if (filters.begin) params.append('begin', filters.begin);
      if (filters.end) params.append('end', filters.end);

      console.log('Fetching reports with params:', Object.fromEntries(params));

      const response = await fetch(`/api/admin/mailgun/delivery-reports?${params}`);
      const data: DeliveryReportsResponse = await response.json();

      console.log('API Response:', {
        ok: response.ok,
        status: response.status,
        success: data.success,
        itemCount: data.data?.items?.length,
        debug: data.debug
      });

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to fetch reports`);
      }

      if (data.success && data.data?.items) {
        setReports(data.data.items);
        setFilteredReports(data.data.items);
        setDebugInfo(data.debug);

        // Log debug information
        console.log('Reports fetched successfully:', {
          totalItems: data.data.items.length,
          maxPossible: 300,
          dateRange: data.debug?.dateRange,
          firstItem: data.data.items[0],
          lastItem: data.data.items[data.data.items.length - 1]
        });
      } else {
        throw new Error('Invalid response format: ' + JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAllReports = () => {
    setExpandedRows(new Set());
    setSearchTerm('');
    fetchReports();
  };

  // Filter reports based on search term
  const filterReports = (reports: MailGunEvent[], searchTerm: string) => {
    if (!searchTerm.trim()) {
      return reports;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    return reports.filter(event => {
      const recipient = event.recipient?.toLowerCase() || '';
      const subject = event.message?.headers?.subject?.toLowerCase() || '';
      const eventType = event.event?.toLowerCase() || '';
      const messageId = event.message?.headers?.['message-id']?.toLowerCase() || '';
      const deliveryMessage = event['delivery-status']?.message?.toLowerCase() || '';
      const reason = event.reason?.toLowerCase() || '';
      const tags = event.tags?.join(' ').toLowerCase() || '';

      return recipient.includes(lowercaseSearch) ||
        subject.includes(lowercaseSearch) ||
        eventType.includes(lowercaseSearch) ||
        messageId.includes(lowercaseSearch) ||
        deliveryMessage.includes(lowercaseSearch) ||
        reason.includes(lowercaseSearch) ||
        tags.includes(lowercaseSearch);
    });
  };

  // Update filtered reports when search term or reports change
  useEffect(() => {
    const filtered = filterReports(reports, searchTerm);
    setFilteredReports(filtered);
  }, [reports, searchTerm]);

  const toggleRowExpansion = (eventId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(eventId)) {
      newExpandedRows.delete(eventId);
    } else {
      newExpandedRows.add(eventId);
    }
    setExpandedRows(newExpandedRows);
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);

    // Always use Eastern Time (US) - UTC-5 (EST) or UTC-4 (EDT)
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' ET';
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'bounced': return 'bg-orange-100 text-orange-800';
      case 'complained': return 'bg-purple-100 text-purple-800';
      case 'unsubscribed': return 'bg-gray-100 text-gray-800';
      case 'clicked': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get the minimum allowed date (5 days ago)
  const getMinDate = () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    return fiveDaysAgo.toISOString().slice(0, 16);
  };

  // Helper function to get the maximum allowed date (now)
  const getMaxDate = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="text-sm text-gray-500 flex items-center space-x-2">
            <Link href="/admin" className="text-gray-500 hover:underline">
              Admin Dashboard
            </Link>
            <svg
              className="w-4 h-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-900 font-semibold">MailGun Reports</span>
          </nav>

          <div className="mt-4 flex items-start space-x-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-gray-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">MailGun Delivery Reports</h1>
              <p className="mt-1 text-gray-500">
                Monitor email delivery status and events (Max 300 events)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    <strong>Data Retention:</strong> MailGun only retains event data for the last 5 days. Events older than 5 days are not available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">Search & Filters</h2>

              {/* Compact layout with search and filters in one row on larger screens */}
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by recipient, subject, event type, message ID, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={filters.event}
                      onChange={(e) => setFilters({ ...filters, event: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="">All Events</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed</option>
                      <option value="bounced">Bounced</option>
                      <option value="complained">Complained</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="clicked">Clicked</option>
                      <option value="opened">Opened</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Begin Date <span className="text-gray-500">(Last 5 days)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={filters.begin}
                      min={getMinDate()}
                      max={getMaxDate()}
                      onChange={(e) => setFilters({ ...filters, begin: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Date <span className="text-gray-500">(Last 5 days)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={filters.end}
                      min={getMinDate()}
                      max={getMaxDate()}
                      onChange={(e) => setFilters({ ...filters, end: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={fetchAllReports}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Fetch All (Max 300)'}
                    </button>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                        setFilters({
                          ...filters,
                          begin: oneHourAgo.toISOString().slice(0, 16),
                          end: now.toISOString().slice(0, 16),
                        });
                      }}
                      className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      1h
                    </button>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        setFilters({
                          ...filters,
                          begin: yesterday.toISOString().slice(0, 16),
                          end: now.toISOString().slice(0, 16),
                        });
                      }}
                      className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      24h
                    </button>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                        setFilters({
                          ...filters,
                          begin: fiveDaysAgo.toISOString().slice(0, 16),
                          end: now.toISOString().slice(0, 16),
                        });
                      }}
                      className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      5d
                    </button>
                  </div>

                  <div className="text-xs text-gray-600">
                    {searchTerm ? (
                      <>Filtered: {filteredReports.length} of {reports.length}</>
                    ) : (
                      <>Total: {reports.length}</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-red-800">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && reports.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Debug: Fetch Info</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Reports Count: {reports.length} (Max: 300)</div>
                <div>Filtered Count: {filteredReports.length}</div>
                <div>Debug Info: {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'None'}</div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center text-gray-500">
                  No delivery events found for the selected criteria.
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center text-gray-500">
                  <div className="mb-2">No events match your search criteria.</div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4">
                          {/* Expand/Collapse column */}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredReports.map((event) => {
                        const isExpanded = expandedRows.has(event.id);
                        const subject = event.message?.headers?.subject || 'N/A';
                        const details = event['delivery-status']?.message || event.reason || 'N/A';

                        return (
                          <React.Fragment key={event.id}>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => toggleRowExpansion(event.id)}
                                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                                >
                                  <svg
                                    className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatTimestamp(event.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventColor(event.event)}`}>
                                  {event.event}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {event.recipient}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="truncate">
                                  {subject}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${event.id}-expanded`} className="bg-gray-50">
                                <td colSpan={5} className="px-6 py-4">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Full Subject:</h4>
                                      <div className="bg-white p-3 rounded border text-sm text-gray-700 break-words">
                                        {subject}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Full Details:</h4>
                                      <div className="bg-white p-3 rounded border text-sm text-gray-700 break-words">
                                        {details}
                                      </div>
                                    </div>
                                    {event.message?.headers?.['message-id'] && (
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Message ID:</h4>
                                        <div className="bg-white p-3 rounded border text-sm text-gray-700 font-mono break-all">
                                          {event.message.headers['message-id']}
                                        </div>
                                      </div>
                                    )}
                                    {event.tags && event.tags.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Tags:</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {event.tags.map((tag, index) => (
                                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}