import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { followUpScheduler } from "@/services/FollowUpScheduler";
import { notificationService } from "@/services/NotificationService";
import { LeadStatus, FollowupStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/leads/[id]/follow-ups - Restart follow-up sequence
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Get the lead to verify it exists and check status
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        intakeToken: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Cancel any existing pending follow-ups
    await followUpScheduler.cancelFollowUpsForLead(leadId);

    // Only schedule new follow-ups if lead is in PENDING status
    if (lead.status === LeadStatus.PENDING) {
      const result = await followUpScheduler.scheduleFollowUpsForLead(leadId);
      
      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to restart follow-ups", details: result.errors },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Follow-up sequence restarted successfully",
        scheduledCount: result.scheduledCount,
      });
    } else {
      return NextResponse.json({
        message: "Follow-ups cancelled (lead status is not PENDING)",
        scheduledCount: 0,
      });
    }
  } catch (error) {
    console.error("Error restarting follow-ups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}