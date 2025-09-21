"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import PageLoading from "@/components/PageLoading";

// Render nav links conditionally here so unauthorized users never see
// the admin link placeholders (and therefore won't see the Access denied
// UI rendered by RoleGuard when used without an explicit fallback).

export default function AdminIndexPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <PageLoading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="text-sm text-gray-500 flex items-center space-x-2">
            <Link href="/" className="text-gray-500 hover:underline">
              Home
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
            <span className="text-gray-900 font-semibold">Admin Dashboard</span>
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
                  d="M12 8v4l3 3"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-gray-500">
                Administrative tools and pages
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {session && (session.user?.role === "ADMIN" || session.user?.role === "SYSTEM_ADMIN") && (
            <Link
              href="/admin/users"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage application users
              </p>
            </Link>
          )}

          {session && (session.user?.role === "ADMIN" || session.user?.role === "SYSTEM_ADMIN") && (
            <Link
              href="/admin/settings"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="mt-1 text-sm text-gray-600">
                System settings and configuration
              </p>
            </Link>
          )}

          {session && (
            <Link
              href="/admin/notifications"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">
                Notifications
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                View recent notification logs
              </p>
            </Link>
          )}

          {session && (session.user?.role === "ADMIN" || session.user?.role === "SYSTEM_ADMIN") && (
            <Link
              href="/admin/mailgun-reports"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">
                MailGun Reports
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Email delivery reports and events
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
