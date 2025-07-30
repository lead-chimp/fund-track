"use client"

import { useSession } from "next-auth/react"
import { UserRole } from "@prisma/client"
import { ReactNode } from "react"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session || !allowedRoles.includes(session.user.role)) {
    return fallback || <div>Access denied</div>
  }

  return <>{children}</>
}

// Convenience components for common role checks
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function AuthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.USER]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}