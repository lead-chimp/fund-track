"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { NotificationLog, NotificationStatus } from "@prisma/client";

function formatRecipient(log: Partial<NotificationLog>) {
  return log.recipient || "-";
}

export default function NotificationsAdminPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [cursors, setCursors] = useState<string[]>([""]); // '' means start
  const [cursorIndex, setCursorIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");

  const searchRef = useRef(search);
  const [latestNextCursor, setLatestNextCursor] = useState<string | null>(null);

  // Centralized fetch that accepts an explicit cursor and search term.
  const fetchPage = useCallback(
    async (cursor?: string, searchTerm?: string) => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          limit: String(limit),
        });
        if (searchTerm) query.set("search", searchTerm);
        if (cursor) query.set("cursor", cursor);
        const res = await fetch(`/api/admin/notifications?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to load logs");
        const data = await res.json();
        setLogs(data.logs || []);
        setHasMore(Boolean(data.hasMore));
        setLatestNextCursor(data.nextCursor ? String(data.nextCursor) : null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // Fetch when the cursor index or limit changes.
  useEffect(() => {
    const currentCursor = cursors[cursorIndex] || undefined;
    fetchPage(currentCursor, searchRef.current);
  }, [cursorIndex, limit, fetchPage, cursors]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Reset cursors when starting a new search.
    setCursors([""]);
    setCursorIndex(0);
    await fetchPage(undefined, searchRef.current);
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
            <span className="text-gray-900 font-semibold">
              Notification Logs
            </span>
          </nav>

          <div className="mt-4 flex items-start space-x-4">
            <div className="bg-gray-100 rounded-lg p-3">
              {/* bell icon */}
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Notification Logs
              </h1>
              <p className="mt-1 text-gray-500">
                Recent email and SMS delivery history
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowFilters(!showFilters);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">&nbsp;</div>
            <button
              onClick={() => fetchPage(cursors[cursorIndex], searchRef.current)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <form onSubmit={handleSearch} className="mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      searchRef.current = e.target.value;
                    }}
                    placeholder="recipient, subject, content..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-6">
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
              ) : logs.length === 0 ? (
                <div className="text-center text-gray-500">
                  No notification logs found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject / Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {log.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatRecipient(log)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.subject || log.content || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                                log.status === NotificationStatus.SENT
                                  ? "bg-green-100 text-green-800"
                                  : log.status === NotificationStatus.FAILED
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {log.errorMessage || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {cursorIndex === 0 ? "Newest" : `Page ${cursorIndex + 1}`}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    if (cursorIndex > 0) setCursorIndex((i) => i - 1);
                  }}
                  disabled={cursorIndex === 0 || loading}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading && (
                    <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
                  )}
                  Previous
                </button>
                <button
                  onClick={() => {
                    if (hasMore && latestNextCursor) {
                      // Append the next cursor and advance index
                      setCursors((arr) => {
                        const next = String(latestNextCursor);
                        // Avoid duplicates
                        if (arr[arr.length - 1] === next) return arr;
                        return [...arr, next];
                      });
                      setCursorIndex((i) => i + 1);
                    }
                  }}
                  disabled={!hasMore || loading}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading && (
                    <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
                  )}
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
