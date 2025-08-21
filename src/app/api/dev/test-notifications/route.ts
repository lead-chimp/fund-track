import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/NotificationService';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, recipient, subject, message, leadId } = body;

    // Validate required fields
    if (!type || !recipient) {
      return NextResponse.json(
        { error: 'Type and recipient are required' },
        { status: 400 }
      );
    }

    if (type !== 'email' && type !== 'sms') {
      return NextResponse.json(
        { error: 'Type must be either "email" or "sms"' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'email') {
      if (!subject || !message) {
        return NextResponse.json(
          { error: 'Subject and message are required for email' },
          { status: 400 }
        );
      }

      result = await notificationService.sendEmail({
        to: recipient,
        subject: subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        leadId: leadId ? parseInt(leadId) : undefined,
      });
    } else {
      if (!message) {
        return NextResponse.json(
          { error: 'Message is required for SMS' },
          { status: 400 }
        );
      }

      result = await notificationService.sendSMS({
        to: recipient,
        message: message,
        leadId: leadId ? parseInt(leadId) : undefined,
      });
    }

    return NextResponse.json({
      success: result.success,
      externalId: result.externalId,
      error: result.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get recent test notifications for debugging
    const recentNotifications = await notificationService.getRecentNotifications(20);
    
    // Get some sample leads for testing
    const sampleLeads = await prisma.lead.findMany({
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      recentNotifications,
      sampleLeads,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get test notifications error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}