import { auth } from "@/lib/auth"

import { redirect } from "next/navigation"

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Double-check authorization on the server side
  if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Warning Banner */}
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Development Tools - System Admin Access</h3>
              <p className="text-xs text-red-100">
                These tools can modify live data. Use with extreme caution.
              </p>
            </div>
          </div>
          <div className="text-xs text-red-100">
            User: {session.user.email} | Role: {session.user.role}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="flex space-x-6">
            <a
              href="/dev/test-legacy-db"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Legacy DB Testing
            </a>
            <a
              href="/dev/test-notifications"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Notification Testing
            </a>
            <a
              href="/dev/reset-intake"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Reset Intake
            </a>
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-50 ml-auto"
            >
              ← Back to Dashboard
            </a>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  )
}