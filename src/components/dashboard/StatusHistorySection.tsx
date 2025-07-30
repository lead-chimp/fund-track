'use client';

import { useState, useEffect } from 'react';
import { LeadStatus } from '@prisma/client';

interface StatusHistoryItem {
  id: number;
  previousStatus: LeadStatus | null;
  newStatus: LeadStatus;
  changedBy: number;
  reason: string | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
  };
}

interface StatusTransition {
  status: LeadStatus;
  description: string;
  requiresReason: boolean;
}

interface StatusHistorySectionProps {
  leadId: number;
  currentStatus: LeadStatus;
  onStatusChange?: (newStatus: LeadStatus, reason?: string) => void;
}

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'New',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function StatusHistorySection({ 
  leadId, 
  currentStatus, 
  onStatusChange 
}: StatusHistorySectionProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [availableTransitions, setAvailableTransitions] = useState<StatusTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchStatusInfo();
  }, [leadId]);

  const fetchStatusInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${leadId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch status information');
      }

      const data = await response.json();
      setHistory(data.history || []);
      setAvailableTransitions(data.availableTransitions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;

    try {
      setUpdating(true);
      
      const updateData: any = { status: selectedStatus };
      if (reason.trim()) {
        updateData.reason = reason.trim();
      }

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Refresh status info
      await fetchStatusInfo();
      
      // Reset form
      setSelectedStatus('');
      setReason('');
      setShowStatusChange(false);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(selectedStatus, reason.trim() || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const selectedTransition = availableTransitions.find(t => t.status === selectedStatus);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status History</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Status History</h3>
        {availableTransitions.length > 0 && (
          <button
            onClick={() => setShowStatusChange(!showStatusChange)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Change Status
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Current Status */}
      <div className="mb-6">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-500 mr-2">Current Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[currentStatus]}`}>
            {statusLabels[currentStatus]}
          </span>
        </div>
      </div>

      {/* Status Change Form */}
      {showStatusChange && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Change Status</h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                New Status
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Select a status...</option>
                {availableTransitions.map((transition) => (
                  <option key={transition.status} value={transition.status}>
                    {statusLabels[transition.status]} - {transition.description}
                  </option>
                ))}
              </select>
            </div>

            {selectedTransition?.requiresReason && (
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for this status change..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}

            {!selectedTransition?.requiresReason && (
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason (optional)
                </label>
                <textarea
                  id="reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason for this status change..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowStatusChange(false);
                  setSelectedStatus('');
                  setReason('');
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={!selectedStatus || updating || (selectedTransition?.requiresReason && !reason.trim())}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status History */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">History</h4>
        
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No status changes recorded.</p>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {history.map((item, itemIdx) => (
                <li key={item.id}>
                  <div className="relative pb-8">
                    {itemIdx !== history.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Status changed from{' '}
                            {item.previousStatus ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.previousStatus]}`}>
                                {statusLabels[item.previousStatus]}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}{' '}
                            to{' '}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.newStatus]}`}>
                              {statusLabels[item.newStatus]}
                            </span>
                          </p>
                          {item.reason && (
                            <p className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Reason:</span> {item.reason}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            by {item.user.email}
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}