import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { LeadStatus } from "@prisma/client";

// Utility function to convert BigInt values to strings for JSON serialization
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

export async function GET() {
  try {
    // Get leads with intake progress information
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        businessName: true,
        status: true,
        intakeToken: true,
        step1CompletedAt: true,
        step2CompletedAt: true,
        step3CompletedAt: true,
        intakeCompletedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200, // Limit to prevent overwhelming the UI
    });

    return NextResponse.json({
      leads: serializeBigInt(leads),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get leads for intake reset error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session for audit trail
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id ? parseInt(session.user.id) : null;

    // If no session user, find any admin user for dev operations
    if (!userId) {
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      if (!adminUser) {
        // If no admin user exists, find any user
        const anyUser = await prisma.user.findFirst({
          select: { id: true },
        });
        userId = anyUser?.id || null;
      } else {
        userId = adminUser.id;
      }
    }

    const body = await request.json();
    const { action, leadIds, filters } = body;

    if (!action || !["reset-intake", "reset-intake-all"].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "reset-intake" or "reset-intake-all"' },
        { status: 400 }
      );
    }

    let targetLeadIds: number[] = [];

    if (action === "reset-intake") {
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json(
          { error: "leadIds array is required for reset-intake action" },
          { status: 400 }
        );
      }
      targetLeadIds = leadIds;
    } else if (action === "reset-intake-all") {
      // Get leads based on filters
      const whereClause: any = {};

      if (filters?.status && filters.status !== "all") {
        whereClause.status = filters.status;
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        whereClause.OR = [
          {
            firstName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            businessName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ];
      }

      const matchingLeads = await prisma.lead.findMany({
        where: whereClause,
        select: { id: true },
      });

      targetLeadIds = matchingLeads.map((lead) => lead.id);
    }

    if (targetLeadIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No leads found matching the criteria",
      });
    }

    // Log the operation
    logger.info(
      `Dev: Resetting intake process for ${targetLeadIds.length} leads`,
      {
        action,
        leadIds: targetLeadIds,
        userId,
        timestamp: new Date().toISOString(),
      }
    );

    // Perform the reset operation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get leads before reset for status history
      const leadsBeforeReset = await tx.lead.findMany({
        where: { id: { in: targetLeadIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          step1CompletedAt: true,
          step2CompletedAt: true,
          step3CompletedAt: true,
          intakeCompletedAt: true,
        },
      });

      // Reset intake completion timestamps and status for the specified leads
      const updateResult = await tx.lead.updateMany({
        where: {
          id: { in: targetLeadIds },
          OR: [
            { step1CompletedAt: { not: null } },
            { step2CompletedAt: { not: null } },
            { step3CompletedAt: { not: null } },
            { intakeCompletedAt: { not: null } },
            { status: { in: [LeadStatus.IN_PROGRESS, LeadStatus.COMPLETED] } },
          ],
        },
        data: {
          step1CompletedAt: null,
          step2CompletedAt: null,
          step3CompletedAt: null,
          intakeCompletedAt: null,
          digitalSignature: null,
          signatureDate: null,
          status: LeadStatus.PENDING, // Reset status to PENDING
          updatedAt: new Date(),
        },
      });

      // Get updated leads for response
      const updatedLeads = await tx.lead.findMany({
        where: { id: { in: targetLeadIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          businessName: true,
          status: true,
          step1CompletedAt: true,
          step2CompletedAt: true,
          step3CompletedAt: true,
          intakeCompletedAt: true,
        },
      });

      return {
        resetCount: updateResult.count,
        resetLeads: updatedLeads,
        totalTargeted: targetLeadIds.length,
        leadsBeforeReset,
      };
    });

    // Create status history entries outside the transaction to avoid transaction abortion
    if (userId) {
      const leadsToCreateHistory = result.leadsBeforeReset.filter(
        (lead) =>
          lead.step1CompletedAt !== null ||
          lead.step2CompletedAt !== null ||
          lead.step3CompletedAt !== null ||
          lead.intakeCompletedAt !== null
      );

      if (leadsToCreateHistory.length > 0) {
        const statusHistoryEntries = leadsToCreateHistory.map((lead) => ({
          leadId: lead.id,
          previousStatus: lead.status,
          newStatus: LeadStatus.PENDING, // Status reset to PENDING
          changedBy: userId,
          reason: `Dev: Intake process reset - ${lead.firstName} ${lead.lastName}`,
          createdAt: new Date(),
        }));

        try {
          await prisma.leadStatusHistory.createMany({
            data: statusHistoryEntries,
          });
        } catch (historyError) {
          // Log the error but don't fail the entire operation
          console.warn(
            "Failed to create status history entries:",
            historyError
          );
          logger.warn("Dev: Failed to create status history for intake reset", {
            error:
              historyError instanceof Error
                ? historyError.message
                : "Unknown error",
            leadCount: leadsToCreateHistory.length,
            userId,
          });
        }
      }
    } else {
      logger.warn(
        "Dev: Skipping status history creation - no valid user ID found",
        {
          leadCount: result.leadsBeforeReset.filter(
            (lead) =>
              lead.step1CompletedAt !== null ||
              lead.step2CompletedAt !== null ||
              lead.step3CompletedAt !== null ||
              lead.intakeCompletedAt !== null
          ).length,
        }
      );
    }

    logger.info(
      `Dev: Successfully reset intake process for ${result.resetCount} leads`,
      {
        resetCount: result.resetCount,
        totalTargeted: result.totalTargeted,
        userId,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Reset intake process completion for leads`,
      resetCount: result.resetCount,
      totalTargeted: result.totalTargeted,
      resetLeads: serializeBigInt(result.resetLeads),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset intake error:", error);
    logger.error("Dev: Failed to reset intake process", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
