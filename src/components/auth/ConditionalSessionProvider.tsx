"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"

interface ConditionalSessionProviderProps {
    children: ReactNode
}

export function ConditionalSessionProvider({ children }: ConditionalSessionProviderProps) {
    const pathname = usePathname()

    // Don't use SessionProvider for public intake pages, auth pages, or health checks
    const isPublicRoute = pathname?.startsWith('/application/') ||
        pathname?.startsWith('/auth/') ||
        pathname === '/api/health'

    if (isPublicRoute) {
        return <>{children}</>
    }

    return (
        <NextAuthSessionProvider>
            {children}
        </NextAuthSessionProvider>
    )
}