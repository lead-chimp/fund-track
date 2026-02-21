import { NextRequest, NextResponse } from "next/server";
import { createLeadPoller } from "@/services/LeadPoller";
import { notificationService } from "@/services/NotificationService";
import { TokenService } from "@/services/TokenService";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  validateCronRequest,
  createUnauthorizedResponse,
} from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  // Validate cron request authentication
  if (!validateCronRequest(request)) {
    logger.warn("Unauthorized cron request to poll-leads endpoint");
    return createUnauthorizedResponse();
  }

  try {
    logger.info("Starting manual lead polling process via API endpoint");

    // Create lead poller instance
    const leadPoller = createLeadPoller();

    // Poll and import leads
    const pollingResult = await leadPoller.pollAndImportLeads();

    // If we have new leads, send notifications
    if (pollingResult.newLeads > 0) {
      logger.info(
        `Processing notifications for ${pollingResult.newLeads} new leads`,
      );

      // Get newly imported leads that need notifications
      const newLeads = await prisma.lead.findMany({
        where: {
          status: "PENDING",
          intakeToken: { not: null },
          // Get leads imported in the last 20 minutes to catch this batch
          importedAt: {
            gte: new Date(Date.now() - 20 * 60 * 1000),
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

        const baseUrl = (
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const intakeUrl = `${baseUrl}/application/${lead.intakeToken}`;
        const leadName = lead.firstName
          ? lead.firstName.charAt(0).toUpperCase() +
            lead.firstName.slice(1).toLowerCase()
          : lead.businessName || "there";

        // Send email notification if email exists
        if (lead.email) {
          try {
            const emailResult = await notificationService.sendEmail({
              to: lead.email,
              subject: "Complete Your Merchant Funding Application",
              text: `Hi ${leadName},\n\nThank you for requesting information on merchant funding for your business. My name is Ryan and I'll be assisting you through the process. Please click on the link below to complete your application:\n\n${intakeUrl}\n\nThis secure link will allow you to provide the required information and upload necessary documents. Please note that you will be prompted to submit the last 3 months' business bank statements.\n\nPlease call or email if you have any questions, otherwise we will be in touch shortly.\n\nBest Regards,\n\nRyan\nFunding Specialist\n\nsupport@merchantfunding.com\n\n+1 888-867-3087`,
              html: `
                <h2>Complete Your Merchant Funding Application</h2>
                <p>Hi ${leadName},</p>
                <p>Thank you for requesting information on merchant funding for your business. My name is Ryan and I'll be assisting you through the process. Please click on the link below to complete your application:</p>
                <p><a href="${intakeUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Click here to complete your application</a></p>
                <p>This secure link will allow you to provide the required information and upload necessary documents. Please note that you will be prompted to submit the last 3 months' business bank statements.</p>
                <p>Please call or email if you have any questions, otherwise we will be in touch shortly.</p>
                <p>Best Regards,</p>
                <p>Ryan<br>Funding Specialist</p>
                <p><a href="mailto:support@merchantfunding.com">support@merchantfunding.com</a></p>
                <p><a href="tel:+18888673087">+1 888-867-3087</a></p>
              `,
              leadId: lead.id,
            });

            if (emailResult.success) {
              notificationResults.emailsSent++;
              logger.notification(
                `Email sent successfully`,
                "email",
                lead.email,
                { leadId: lead.id },
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

        // Small delay between notifications to reduce rate-limit risk
        await new Promise((resolve) => setTimeout(resolve, 100));
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
      { status: 500 },
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
