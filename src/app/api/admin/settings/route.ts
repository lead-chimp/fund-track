import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { systemSettingsService } from "@/services/SystemSettingsService";
import { UserRole } from "@prisma/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let settings;
    if (category) {
      settings = await systemSettingsService.getSettingsByCategory(
        category as any
      );
    } else {
      settings = await systemSettingsService.getAllSettings();
    }

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error("Error fetching system settings", error as Error, {
      route: "/api/admin/settings",
      method: "GET",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch system settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Updates must be an array" },
        { status: 400 }
      );
    }

    // Validate updates format
    for (const update of updates) {
      if (!update.key || update.value === undefined) {
        return NextResponse.json(
          { error: "Each update must have key and value" },
          { status: 400 }
        );
      }
    }

    const userId = session.user.id ? parseInt(session.user.id) : undefined;

    const updatedSettings = await systemSettingsService.updateSettings(
      updates,
      userId && !isNaN(userId) ? userId : undefined
    );

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    logger.error("Error updating system settings", error as Error, {
      route: "/api/admin/settings",
      method: "PUT",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 500 }
    );
  }
}
