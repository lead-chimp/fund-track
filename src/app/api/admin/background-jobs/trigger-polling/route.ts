import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function getCronBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET not configured",
          message: "Cannot trigger cron; CRON_SECRET is missing",
        },
        { status: 500 }
      );
    }

    console.log(
      "🔄 Manual lead polling triggered by admin:",
      session.user.email
    );

    const baseUrl = getCronBaseUrl();
    const response = await fetch(`${baseUrl}/api/cron/poll-leads`, {
      method: "POST",
      headers: {
        "x-cron-secret": cronSecret,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: body.error ?? "Cron endpoint returned an error",
          message: "Lead polling request failed",
          details: body,
        },
        { status: response.status >= 400 ? response.status : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead polling executed successfully",
      timestamp: new Date().toISOString(),
      triggeredBy: session.user.email,
      data: body,
    });
  } catch (error) {
    console.error("❌ Failed to execute manual lead polling:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "Failed to execute lead polling",
      },
      { status: 500 }
    );
  }
}
