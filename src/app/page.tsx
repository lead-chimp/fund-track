"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Merchant Funding App
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Internal lead management system for Merchant Funding staff
        </p>
        
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Staff Sign In
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>For prospect intake, use the link provided in your email or SMS</p>
          </div>
        </div>
      </div>
    </main>
  )
}