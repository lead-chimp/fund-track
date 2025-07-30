import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { leadStatusService } from '@/services/LeadStatusService';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = parseInt(params.id);
    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
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
          orderBy: { createdAt: 'desc' },
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
          orderBy: { uploadedAt: 'desc' },
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
          orderBy: { createdAt: 'desc' },
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
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = parseInt(params.id);
    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, firstName, lastName, email, phone, businessName, reason } = body;

    // Validate status if provided
    if (status && !Object.values(LeadStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Handle status change separately with validation and audit logging
    if (status !== undefined && status !== existingLead.status) {
      const statusChangeResult = await leadStatusService.changeLeadStatus({
        leadId,
        newStatus: status,
        changedBy: parseInt(session.user.id),
        reason
      });

      if (!statusChangeResult.success) {
        return NextResponse.json(
          { error: statusChangeResult.error },
          { status: 400 }
        );
      }

      // If only status was being updated, return the result from status service
      if (firstName === undefined && lastName === undefined && email === undefined &&
        phone === undefined && businessName === undefined) {
        return NextResponse.json({
          lead: statusChangeResult.lead,
          followUpsCancelled: statusChangeResult.followUpsCancelled,
          staffNotificationSent: statusChangeResult.staffNotificationSent
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
            orderBy: { createdAt: 'desc' },
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
            orderBy: { uploadedAt: 'desc' },
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
            orderBy: { createdAt: 'desc' },
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

      return NextResponse.json({ lead: updatedLead });
    }

    // If no updates were made, return the existing lead
    return NextResponse.json({ lead: existingLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}