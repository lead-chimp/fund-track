/* eslint-disable @next/next/no-img-element */
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AuthenticatedOnly } from "@/components/auth/RoleGuard";
import { LeadDashboard } from "@/components/dashboard/LeadDashboard";
import { UserRole } from "@prisma/client";
import PageLoading from "@/components/PageLoading";

function ContextMenuButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: Event) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg
          className="w-4 h-4 text-gray-700"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
        <span className="sr-only">Open menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50"
        >
          <Link
            href="/admin"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Admin Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") return <PageLoading />;

  if (!session) {
    return null;
  }

  return (
    <AuthenticatedOnly
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You need to be authenticated to access this page.
            </p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <img
                  src="https://merchantfunding.com/assets/img/merchant-funding-logo.png"
                  alt="Merchant Funding Logo"
                  className="h-8 w-auto mr-3"
                />
                <h1 className="text-xl font-semibold text-gray-900">
                  FUND TRACK
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {session.user.email}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {session.user.role}
                </span>

                {session.user?.role === UserRole.ADMIN && <ContextMenuButton />}

                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <LeadDashboard />
          </div>
        </main>
      </div>
    </AuthenticatedOnly>
  );
}
