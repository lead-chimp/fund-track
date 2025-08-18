import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadStatusService } from "@/services/LeadStatusService";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Get lead to check current status
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get status history
    const historyResult = await leadStatusService.getLeadStatusHistory(leadId);
    if (!historyResult.success) {
      return NextResponse.json({ error: historyResult.error }, { status: 500 });
    }

    // Get available transitions
    const availableTransitions = leadStatusService.getAvailableTransitions(
      lead.status
    );

    return NextResponse.json({
      currentStatus: lead.status,
      history: historyResult.history,
      availableTransitions,
    });
  } catch (error) {
    console.error("Error fetching lead status info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
