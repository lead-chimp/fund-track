"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { serverSignOut } from "./actions";

export default function AuthTestPage() {
  const { data: session, status, update } = useSession();
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log("[Auth Test]", message);
  };

  const clearLog = () => setLog([]);

  // Method 1: NextAuth signOut with redirect: false
  const handleMethod1 = async () => {
    try {
      addLog("🔵 Method 1: NextAuth signOut({ redirect: false })");
      await signOut({ redirect: false });
      addLog("✅ Method 1: Signout successful");
      addLog("Redirecting to /auth/signin...");
      window.location.href = "/auth/signin";
    } catch (error) {
      addLog(`❌ Method 1 failed: ${error}`);
    }
  };

  // Method 2: NextAuth signOut with default behavior
  const handleMethod2 = async () => {
    try {
      addLog("🟢 Method 2: NextAuth signOut() with default redirect");
      await signOut({ callbackUrl: "/auth/signin" });
      addLog("✅ Method 2: Signout successful");
    } catch (error) {
      addLog(`❌ Method 2 failed: ${error}`);
    }
  };

  // Method 3: Server action
  const handleMethod3 = async () => {
    try {
      addLog("🟡 Method 3: Server Action signout");
      const result = await serverSignOut();
      if (result.success) {
        addLog("✅ Method 3: Server signout successful");
        addLog("Redirecting to /auth/signin...");
        window.location.href = "/auth/signin";
      } else {
        addLog(`❌ Method 3 failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Method 3 failed: ${error}`);
    }
  };

  const refreshSession = async () => {
    addLog("🔄 Refreshing session...");
    await update();
    addLog("✅ Session refreshed");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Authentication Test Suite
          </h1>
          <p className="text-gray-600">
            Test different signout methods to find what works
          </p>
        </div>

        {/* Session Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📊 Session Status
          </h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === "authenticated"
                    ? "bg-green-100 text-green-800"
                    : status === "loading"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {status}
              </span>
            </div>
            {session?.user && (
              <>
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  {session.user.email}
                </div>
                <div>
                  <span className="font-semibold">Role:</span>{" "}
                  {session.user.role}
                </div>
                <div>
                  <span className="font-semibold">ID:</span> {session.user.id}
                </div>
              </>
            )}
          </div>
          <button
            onClick={refreshSession}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            🔄 Refresh Session
          </button>
        </div>

        {/* Test Methods */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🚀 Signout Methods
          </h2>
          <p className="text-gray-600 mb-4">
            Click each button to test different signout approaches. Check the
            log below and browser console for details.
          </p>

          <div className="space-y-4">
            {/* Method 1 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                🔵 Method 1: redirect: false + manual redirect
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Uses{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  signOut(&#123; redirect: false &#125;)
                </code>{" "}
                then manually redirects
              </p>
              <button
                onClick={handleMethod1}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Test Method 1
              </button>
            </div>

            {/* Method 2 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                🟢 Method 2: Default NextAuth behavior
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Uses{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  signOut(&#123; callbackUrl: &quot;/auth/signin&quot; &#125;)
                </code>
              </p>
              <button
                onClick={handleMethod2}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Test Method 2
              </button>
            </div>

            {/* Method 3 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                🟡 Method 3: Server Action
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Calls server action that runs{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">signOut()</code>{" "}
                server-side
              </p>
              <button
                onClick={handleMethod3}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Test Method 3
              </button>
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">📝 Test Log</h2>
            <button
              onClick={clearLog}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-500">
                No logs yet. Try a signout method above.
              </p>
            ) : (
              log.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📖 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Open browser DevTools (Network and Console tabs)</li>
            <li>Try each signout method one at a time</li>
            <li>Note which method successfully signs you out</li>
            <li>Check for errors in console and network tab</li>
            <li>The working method will redirect you to /auth/signin</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
