import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/NotificationService";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/leads/[id]/send-intake-email - Send one-off intake email
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

    // Get the lead to verify it exists and has required info
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        email: true,
        intakeToken: true,
        status: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead has no email address" },
        { status: 400 }
      );
    }

    if (!lead.intakeToken) {
      return NextResponse.json(
        { error: "Lead has no intake token" },
        { status: 400 }
      );
    }

    // Prepare email content
    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const intakeUrl = `${baseUrl}/application/${lead.intakeToken}`;
    
    const leadName = lead.firstName
      ? lead.firstName.charAt(0).toUpperCase() +
        lead.firstName.slice(1).toLowerCase()
      : lead.businessName || "there";

    const emailSubject = "Complete Your Merchant Funding Application";
    const emailText = `Hi ${leadName},

We wanted to reach out regarding your merchant funding application.

Please complete your application using the link below:
${intakeUrl}

The application only takes a few minutes to complete and will help us process your funding request quickly.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Complete Your Merchant Funding Application</h2>
        <p>Hi ${leadName},</p>
        <p>We wanted to reach out regarding your merchant funding application.</p>
        <p>Please complete your application using the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${intakeUrl}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Complete Your Application</a>
        </div>
        <p>The application only takes a few minutes to complete and will help us process your funding request quickly.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Merchant Funding Team</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          If the button above doesn't work, you can copy and paste this link into your browser:<br>
          <a href="${intakeUrl}" style="color: #3b82f6;">${intakeUrl}</a>
        </p>
      </div>
    `;

    // Validate notification service configuration
    const configValid = await notificationService.validateConfiguration();
    if (!configValid) {
      console.error("Notification service configuration is invalid");
      return NextResponse.json(
        { error: "Email service is not properly configured. Please check environment variables." },
        { status: 500 }
      );
    }

    // Send the email
    console.log(`Attempting to send intake email to ${lead.email} for lead ${lead.id}`);
    
    const result = await notificationService.sendEmail({
      to: lead.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      leadId: lead.id,
    });

    console.log(`Email send result:`, result);

    if (!result.success) {
      console.error(`Failed to send email to ${lead.email}:`, result.error);
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Intake email sent successfully",
      recipient: lead.email,
      externalId: result.externalId,
    });
  } catch (error) {
    console.error("Error sending intake email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}