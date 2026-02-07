import { NextResponse } from "next/server";

function getCronBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function GET() {
  try {
    const scheduler = {
      isRunning: false,
      scheduledExternally: true,
      message: "Tasks run via Coolify scheduled tasks",
    };

    return NextResponse.json({
      success: true,
      action: "scheduler-status",
      result: {
        scheduler,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          cronSecretConfigured: Boolean(process.env.CRON_SECRET),
          campaignIds: process.env.MERCHANT_FUNDING_CAMPAIGN_IDS,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get scheduler status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === "start" || action === "stop") {
      return NextResponse.json(
        {
          error: "Scheduling is done via Coolify; start/stop are no longer supported",
          message: "Use Coolify scheduled tasks to run cron jobs",
        },
        { status: 410 }
      );
    }

    if (action === "poll") {
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

      const baseUrl = getCronBaseUrl();
      const response = await fetch(`${baseUrl}/api/cron/poll-leads`, {
        method: "POST",
        headers: {
          "x-cron-secret": cronSecret,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: data.error ?? "Cron endpoint returned an error",
            message: "Lead polling request failed",
            details: data,
          },
          { status: response.status >= 400 ? response.status : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Lead polling executed manually",
        timestamp: new Date().toISOString(),
        data,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "start", "stop", or "poll"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute scheduler action",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
