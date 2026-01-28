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
    console.group("🔍 NextAuth Signout Diagnostic");

    // 1. Check current session
    console.log("1️⃣ Checking current session...");
    try {
        const sessionResponse = await fetch("/api/auth/session");
        const session = await sessionResponse.json();
        console.log("Session:", session);
    } catch (error) {
        console.error("Failed to fetch session:", error);
    }

    // 2. Check cookies
    console.log("\n2️⃣ Checking cookies...");
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const authCookies = cookies.filter(
        (c) =>
            c.startsWith("next-auth") ||
            c.startsWith("__Secure-next-auth") ||
            c.startsWith("__Host-next-auth")
    );
    console.log("Auth cookies found:", authCookies.length);
    authCookies.forEach((cookie) => console.log("  -", cookie.split("=")[0]));

    // 3. Test signout endpoint directly
    console.log("\n3️⃣ Testing signout endpoint...");
    try {
        const signoutResponse = await fetch("/api/auth/signout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        console.log("Response status:", signoutResponse.status);
        console.log("Response ok:", signoutResponse.ok);
        console.log(
            "Response headers:",
            Object.fromEntries(signoutResponse.headers.entries())
        );

        if (signoutResponse.ok) {
            const text = await signoutResponse.text();
            console.log("Response body:", text);
        } else {
            console.error("Signout failed:", await signoutResponse.text());
        }
    } catch (error) {
        console.error("Signout request error:", error);
    }

    // 4. Check CSRF token
    console.log("\n4️⃣ Checking CSRF token...");
    try {
        const csrfResponse = await fetch("/api/auth/csrf");
        const csrf = await csrfResponse.json();
        console.log("CSRF token:", csrf);
    } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
    }

    // 5. Network info
    console.log("\n5️⃣ Network information:");
    console.log("Origin:", window.location.origin);
    console.log("Pathname:", window.location.pathname);
    console.log("Protocol:", window.location.protocol);
    console.log("Host:", window.location.host);

    // 6. Check for service workers or interceptors
    console.log("\n6️⃣ Checking for interceptors...");
    if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log("Service workers:", registrations.length);
        registrations.forEach((reg) => console.log("  -", reg.scope));
    }

    console.log("\n✅ Diagnostic complete. Check the logs above for issues.");
    console.groupEnd();
}

// Make it available globally for easy debugging
if (typeof window !== "undefined") {
    (window as any).testSignout = testSignout;
    console.log(
        "💡 Signout diagnostic tool loaded. Run window.testSignout() in console to debug."
    );
}
