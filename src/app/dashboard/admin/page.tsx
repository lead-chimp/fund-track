"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AdminOnly, AuthenticatedOnly } from "@/components/auth/RoleGuard";

export default function AdminIndexPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
          <p className="mt-2 text-gray-600">Administrative tools and pages</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminOnly>
            <Link
              href="/dashboard/admin/users"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage application users
              </p>
            </Link>
          </AdminOnly>

          <AdminOnly>
            <Link
              href="/dashboard/admin/settings"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="mt-1 text-sm text-gray-600">
                System settings and configuration
              </p>
            </Link>
          </AdminOnly>

          <AuthenticatedOnly>
            <Link
              href="/dashboard/admin/notifications"
              className="block p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-900">
                Notifications
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                View recent notification logs
              </p>
            </Link>
          </AuthenticatedOnly>
        </div>
      </div>
    </div>
  );
}
