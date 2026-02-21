"use client";

/**
 * Client-side utility to test and debug signout issues
 * Add this to any page during debugging:
 *
 * import { testSignout } from '@/lib/test-signout';
 *
 * Then in browser console:
 * window.testSignout()
 */

export async function testSignout() {
  console.group("[Auth Debug] NextAuth Signout Diagnostic");

  // 1. Check current session
  console.log("[Auth Debug] Checking current session...");
  try {
    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json();
    console.log("Session:", session);
  } catch (error) {
    console.error("Failed to fetch session:", error);
  }

  // 2. Check cookies
  console.log("\n[Auth Debug] Checking cookies...");
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const authCookies = cookies.filter(
    (c) =>
      c.startsWith("next-auth") ||
      c.startsWith("__Secure-next-auth") ||
      c.startsWith("__Host-next-auth"),
  );
  console.log("Auth cookies found:", authCookies.length);
  if (authCookies.length === 0) {
    console.log("[Auth Debug] No cookies visible to JavaScript.");
    console.log("   This is NORMAL if using httpOnly cookies (secure)");
    console.log(
      "   Check Network tab to see if cookies are sent with requests",
    );
  }
  authCookies.forEach((cookie) => console.log("  -", cookie.split("=")[0]));

  // Check for tokens in storage
  console.log("\n[Auth Debug] Checking alternative storage locations:");
  const localStorageKeys = Object.keys(localStorage).filter(
    (k) =>
      k.includes("next-auth") || k.includes("session") || k.includes("token"),
  );
  const sessionStorageKeys = Object.keys(sessionStorage).filter(
    (k) =>
      k.includes("next-auth") || k.includes("session") || k.includes("token"),
  );
  console.log(
    "   localStorage keys:",
    localStorageKeys.length,
    localStorageKeys,
  );
  console.log(
    "   sessionStorage keys:",
    sessionStorageKeys.length,
    sessionStorageKeys,
  );

  // 3. Test signout endpoint directly
  console.log("\n[Auth Debug] Testing signout endpoint...");
  console.log("[Auth Debug] Starting request (10 second timeout)...");
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("[Auth Debug] Request TIMEOUT after 10 seconds!");
      console.error(
        "   This is likely the cause of 'Provisional headers shown'",
      );
    }, 10000);

    const signoutResponse = await fetch("/api/auth/signout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    console.log(`[Auth Debug] Response received in ${elapsed}ms`);
    console.log("Response status:", signoutResponse.status);
    console.log("Response ok:", signoutResponse.ok);
    console.log(
      "Response headers:",
      Object.fromEntries(signoutResponse.headers.entries()),
    );

    if (signoutResponse.ok) {
      const text = await signoutResponse.text();
      console.log("Response body:", text);
    } else {
      console.error("Signout failed:", await signoutResponse.text());
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[Auth Debug] Request ABORTED after ${elapsed}ms - This is the smoking gun!`,
      );
      console.error(
        "   The request never completes, causing 'Provisional headers shown'",
      );
    } else {
      console.error(
        `[Auth Debug] Signout request error after ${elapsed}ms:`,
        error,
      );
    }
  }

  // 4. Check CSRF token
  console.log("\n[Auth Debug] Checking CSRF token...");
  try {
    const csrfResponse = await fetch("/api/auth/csrf");
    const csrf = await csrfResponse.json();
    console.log("CSRF token:", csrf);
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
  }

  // 5. Network info
  console.log("\n[Auth Debug] Network information:");
  console.log("Origin:", window.location.origin);
  console.log("Pathname:", window.location.pathname);
  console.log("Protocol:", window.location.protocol);
  console.log("Host:", window.location.host);

  // 6. Check for service workers or interceptors
  console.log("\n[Auth Debug] Checking for interceptors...");
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log("Service workers:", registrations.length);
    registrations.forEach((reg) => console.log("  -", reg.scope));
  }

  console.log(
    "\n[Auth Debug] Diagnostic complete. Check the logs above for issues.",
  );
  console.groupEnd();
}

// Make it available globally for easy debugging
if (typeof window !== "undefined") {
  (window as any).testSignout = testSignout;
  console.log(
    "[Auth Debug] Signout diagnostic tool loaded. Run window.testSignout() in console to debug.",
  );
}
