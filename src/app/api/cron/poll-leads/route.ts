import { NextRequest, NextResponse } from "next/server";
import { createLeadPoller } from "@/services/LeadPoller";
import { notificationService } from "@/services/NotificationService";
import { TokenService } from "@/services/TokenService";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info("Starting manual lead polling process via API endpoint");

    // Create lead poller instance
    const leadPoller = createLeadPoller();

    // Poll and import leads
    const pollingResult = await leadPoller.pollAndImportLeads();

    // If we have new leads, send notifications
    if (pollingResult.newLeads > 0) {
      logger.info(
        `Processing notifications for ${pollingResult.newLeads} new leads`
      );

      // Get newly imported leads that need notifications
      const newLeads = await prisma.lead.findMany({
        where: {
          status: "PENDING",
          intakeToken: { not: null },
          // Get leads imported in the last 5 minutes to catch this batch
          importedAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
          // Only get leads that haven't had notifications sent yet
          notificationLog: {
            none: {
              status: "SENT",
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // No successful notifications in last 24 hours
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          businessName: true,
          intakeToken: true,
        },
      });

      logger.info(`Found ${newLeads.length} leads to send notifications to`);

      // Send notifications for each new lead
      const notificationResults = {
        emailsSent: 0,
        smsSent: 0,
        emailErrors: 0,
        smsErrors: 0,
      };

      for (const lead of newLeads) {
        if (!lead.intakeToken) continue;

        const intakeUrl = `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/application/${lead.intakeToken}`;
        const leadName =
          lead.firstName && lead.lastName
            ? `${lead.firstName} ${lead.lastName}`
            : lead.businessName || "there";

        // Send email notification if email exists
        if (lead.email) {
          try {
            const emailResult = await notificationService.sendEmail({
              to: lead.email,
              subject: "Complete Your MerchantFund Application",
              text: `Hi ${leadName},\n\nThank you for your interest in merchant funding. Please complete your application by clicking the link below:\n\n${intakeUrl}\n\nThis secure link will allow you to provide the required information and upload necessary documents.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMerchant Funding Team`,
              html: `
                <h2>Complete Your MerchantFund Application</h2>
                <p>Hi ${leadName},</p>
                <p>Thank you for your interest in merchant funding. Please complete your application by clicking the link below:</p>
                <p><a href="${intakeUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Application</a></p>
                <p>This secure link will allow you to provide the required information and upload necessary documents.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>Fund Track Team</p>
              `,
              leadId: lead.id,
            });

            if (emailResult.success) {
              notificationResults.emailsSent++;
              logger.notification(
                `Email sent successfully`,
                "email",
                lead.email,
                { leadId: lead.id }
              );
            } else {
              notificationResults.emailErrors++;
              logger.error(`Failed to send email`, {
                leadId: lead.id,
                recipient: lead.email,
                error: emailResult.error,
              });
            }
          } catch (error) {
            notificationResults.emailErrors++;
            logger.error(`Error sending email`, {
              leadId: lead.id,
              recipient: lead.email,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Send SMS notification if phone exists
        if (lead.phone) {
          try {
            const smsResult = await notificationService.sendSMS({
              to: lead.phone,
              message: `Hi ${leadName}! Complete your merchant funding application: ${intakeUrl}`,
              leadId: lead.id,
            });

            if (smsResult.success) {
              notificationResults.smsSent++;
              logger.notification(`SMS sent successfully`, "sms", lead.phone, {
                leadId: lead.id,
              });
            } else {
              notificationResults.smsErrors++;
              logger.error(`Failed to send SMS`, {
                leadId: lead.id,
                recipient: lead.phone,
                error: smsResult.error,
              });
            }
          } catch (error) {
            notificationResults.smsErrors++;
            logger.error(`Error sending SMS`, {
              leadId: lead.id,
              recipient: lead.phone,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      logger.info("Notification sending completed", notificationResults);

      return NextResponse.json({
        success: true,
        message: "Lead polling and notifications completed successfully",
        pollingResult,
        notificationResults,
      });
    } else {
      logger.info("No new leads found, skipping notifications");

      return NextResponse.json({
        success: true,
        message: "Lead polling completed, no new leads found",
        pollingResult,
      });
    }
  } catch (error) {
    logger.error("Lead polling process failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        message: "Lead polling process failed",
      },
      { status: 500 }
    );
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({
    message: "Lead polling endpoint is available",
    timestamp: new Date().toISOString(),
  });
}
