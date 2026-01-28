import { NextRequest, NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";

/**
 * Custom signout endpoint with enhanced debugging
 * This helps diagnose "Provisional headers are shown" issues
 */
export async function POST(req: NextRequest) {
    try {
        console.log("[SignOut API] Request received");
        console.log("[SignOut API] Headers:", Object.fromEntries(req.headers.entries()));
        console.log("[SignOut API] Origin:", req.headers.get("origin"));
        console.log("[SignOut API] Referer:", req.headers.get("referer"));

        const session = await auth();
        console.log("[SignOut API] Current session:", session ? "exists" : "none");

        // Perform the signout
        const result = await signOut({ redirect: false });

        console.log("[SignOut API] SignOut successful");

        return NextResponse.json(
            { success: true, message: "Signed out successfully" },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                }
            }
        );
    } catch (error) {
        console.error("[SignOut API] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    console.log("[SignOut API] GET request received - redirecting to POST");
    return NextResponse.json(
        { error: "Use POST method for signout" },
        { status: 405 }
    );
}
