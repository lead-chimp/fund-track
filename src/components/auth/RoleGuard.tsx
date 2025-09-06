"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { ReactNode } from "react";
import PageLoading from "@/components/PageLoading";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") return <PageLoading />;

  if (!session || !allowedRoles.includes(session.user.role)) {
    // Treat an explicit `fallback` (including `null`) as the intended
    // rendering for unauthorized users. If `fallback` is undefined,
    // fall back to the default Access denied UI.
    if (fallback !== undefined) return <>{fallback}</>;

    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-gray-100 rounded-md shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">Access denied</h2>
          <p className="mt-2 text-sm text-gray-600">
            You do not have permission to view this page. If you believe this is
            a mistake, contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["ADMIN" as UserRole, "SYSTEM_ADMIN" as UserRole]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function AuthenticatedOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["ADMIN" as UserRole, "USER" as UserRole, "SYSTEM_ADMIN" as UserRole]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}
