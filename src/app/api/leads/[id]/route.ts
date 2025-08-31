export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Delete the lead (cascades if foreign keys are set)
    await prisma.lead.delete({ where: { id: leadId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { leadStatusService } from "@/services/LeadStatusService";

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

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        legacyLeadId: true,
        campaignId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        businessName: true,
        dba: true,
        businessAddress: true,
        businessPhone: true,
        businessEmail: true,
        mobile: true,
        businessCity: true,
        businessState: true,
        businessZip: true,
        ownershipPercentage: true,
        taxId: true,
        stateOfInc: true,
        legalEntity: true,
        industry: true,
        hasExistingLoans: true,
        personalAddress: true,
        personalZip: true,
        dateOfBirth: true,
        socialSecurity: true,
        legalName: true,
        yearsInBusiness: true,
        amountNeeded: true,
        monthlyRevenue: true,
        status: true,
        intakeToken: true,
        intakeCompletedAt: true,
        step1CompletedAt: true,
        step2CompletedAt: true,
        step3CompletedAt: true,
        digitalSignature: true,
        signatureDate: true,
        createdAt: true,
        updatedAt: true,
        importedAt: true,
        notes: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { uploadedAt: "desc" },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            notes: true,
            documents: true,
            followupQueue: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Convert BigInt values to strings for JSON serialization
    const serializedLead = {
      ...lead,
      legacyLeadId: lead.legacyLeadId ? lead.legacyLeadId.toString() : null,
    };

    return NextResponse.json({ lead: serializedLead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { status, firstName, lastName, email, phone, businessName, reason } =
      body;

    // Validate status if provided
    if (status && !Object.values(LeadStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Handle status change separately with validation and audit logging
    if (status !== undefined && status !== existingLead.status) {
      const statusChangeResult = await leadStatusService.changeLeadStatus({
        leadId,
        newStatus: status,
        changedBy: parseInt(session.user.id),
        reason,
      });

      if (!statusChangeResult.success) {
        return NextResponse.json(
          { error: statusChangeResult.error },
          { status: 400 }
        );
      }

      // If only status was being updated, return the result from status service
      if (
        firstName === undefined &&
        lastName === undefined &&
        email === undefined &&
        phone === undefined &&
        businessName === undefined
      ) {
        // Convert BigInt values to strings for JSON serialization
        const serializedLead = statusChangeResult.lead
          ? {
              ...statusChangeResult.lead,
              legacyLeadId: statusChangeResult.lead.legacyLeadId
                ? statusChangeResult.lead.legacyLeadId.toString()
                : null,
            }
          : null;

        return NextResponse.json({
          lead: serializedLead,
          followUpsCancelled: statusChangeResult.followUpsCancelled,
          staffNotificationSent: statusChangeResult.staffNotificationSent,
        });
      }
    }

    // Handle other field updates
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (businessName !== undefined) updateData.businessName = businessName;

    // If there are other fields to update besides status
    if (Object.keys(updateData).length > 0) {
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: updateData,
        include: {
          notes: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          documents: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: { uploadedAt: "desc" },
          },
          statusHistory: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              notes: true,
              documents: true,
              followupQueue: true,
            },
          },
        },
      });

      // Convert BigInt values to strings for JSON serialization
      const serializedLead = {
        ...updatedLead,
        legacyLeadId: updatedLead.legacyLeadId
          ? updatedLead.legacyLeadId.toString()
          : null,
      };

      return NextResponse.json({ lead: serializedLead });
    }

    // If no updates were made, return the existing lead
    // Convert BigInt values to strings for JSON serialization
    const serializedExistingLead = {
      ...existingLead,
      legacyLeadId: existingLead.legacyLeadId
        ? existingLead.legacyLeadId.toString()
        : null,
    };

    return NextResponse.json({ lead: serializedExistingLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
