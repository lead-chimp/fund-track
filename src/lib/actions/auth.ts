"use server";

import { signOut } from "@/lib/auth";

/**
 * Server-side signout action
 * This bypasses all client-side code and runs on the server
 */
export async function serverSignOut() {
    try {
        console.log("[Server Action] Signout initiated");

        // Call signOut on the server side
        await signOut({ redirect: false });

        console.log("[Server Action] Signout successful");
        return { success: true };
    } catch (error) {
        console.error("[Server Action] Signout error:", error);
        return { success: false, error: String(error) };
    }
}
