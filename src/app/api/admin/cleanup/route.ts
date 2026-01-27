import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { notificationCleanupService } from "@/services/NotificationCleanupService";
import { followUpScheduler } from "@/services/FollowUpScheduler";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SYSTEM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, leadId, daysToKeep } = body;

    switch (action) {
      case "cleanup-notifications":
        const days = daysToKeep || 30;
        const result = await notificationCleanupService.cleanupOldNotifications(days);
        return NextResponse.json({
          message: `Cleaned up notifications older than ${days} days`,
          deletedCount: result.deletedCount,
          success: result.success,
          error: result.error,
        });

      case "cleanup-followups":
        const followUpDays = daysToKeep || 30;
        const followUpResult = await followUpScheduler.cleanupOldFollowUps(followUpDays);
        return NextResponse.json({
          message: `Cleaned up follow-ups older than ${followUpDays} days`,
          deletedCount: followUpResult,
          success: true,
        });

      case "emergency-cleanup":
        const emergencyResult = await notificationCleanupService.emergencyCleanup();
        return NextResponse.json({
          message: "Emergency cleanup completed (deleted all notifications older than 7 days)",
          deletedCount: emergencyResult.deletedCount,
          success: emergencyResult.success,
          error: emergencyResult.error,
        });

      case "cleanup-lead-notifications":
        if (!leadId) {
          return NextResponse.json(
            { error: "leadId is required for lead-specific cleanup" },
            { status: 400 }
          );
        }
        const maxToKeep = body.maxToKeep || 10;
        const leadResult = await notificationCleanupService.cleanupExcessiveNotificationsForLead(
          leadId,
          maxToKeep
        );
        return NextResponse.json({
          message: `Cleaned up excessive notifications for lead ${leadId}, kept ${maxToKeep} most recent`,
          deletedCount: leadResult.deletedCount,
          success: leadResult.success,
          error: leadResult.error,
        });

      case "get-stats":
        const stats = await notificationCleanupService.getNotificationStats();
        return NextResponse.json({
          message: "Notification statistics retrieved",
          stats,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: cleanup-notifications, cleanup-followups, emergency-cleanup, cleanup-lead-notifications, get-stats" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Cleanup API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to perform cleanup",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SYSTEM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get notification statistics
    const stats = await notificationCleanupService.getNotificationStats();
    
    return NextResponse.json({
      message: "Notification statistics",
      stats,
      actions: [
        {
          action: "cleanup-notifications",
          description: "Clean up old notification logs",
          parameters: { daysToKeep: "number (default: 30)" }
        },
        {
          action: "cleanup-followups", 
          description: "Clean up old follow-up records",
          parameters: { daysToKeep: "number (default: 30)" }
        },
        {
          action: "emergency-cleanup",
          description: "Emergency cleanup - delete all notifications older than 7 days",
          parameters: {}
        },
        {
          action: "cleanup-lead-notifications",
          description: "Clean up excessive notifications for a specific lead",
          parameters: { leadId: "number", maxToKeep: "number (default: 10)" }
        }
      ]
    });
  } catch (error) {
    console.error("Cleanup API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get cleanup info",
      },
      { status: 500 }
    );
  }
}