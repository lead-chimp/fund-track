import * as cron from "node-cron";
import { createLeadPoller } from "./LeadPoller";
import { notificationService } from "./NotificationService";
import { followUpScheduler } from "./FollowUpScheduler";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class BackgroundJobScheduler {
  private leadPollingTask: cron.ScheduledTask | null = null;
  private followUpTask: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the background job scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Background job scheduler is already running");
      return;
    }

    logger.info("Starting background job scheduler...");

    // Schedule lead polling every 15 minutes
    // Cron pattern: '*/15 * * * *' = every 15 minutes
    const leadPollingPattern =
      process.env.LEAD_POLLING_CRON_PATTERN || "*/15 * * * *";

    this.leadPollingTask = cron.schedule(
      leadPollingPattern,
      async () => {
        await this.executeLeadPollingJob();
      },
      {
        scheduled: false, // Don't start immediately
        timezone: process.env.TZ || "America/New_York",
      } as any
    );

    // Schedule follow-up processing every 5 minutes
    // Cron pattern: '*/5 * * * *' = every 5 minutes
    const followUpPattern = process.env.FOLLOWUP_CRON_PATTERN || "*/5 * * * *";

    this.followUpTask = cron.schedule(
      followUpPattern,
      async () => {
        await this.executeFollowUpJob();
      },
      {
        scheduled: false, // Don't start immediately
        timezone: process.env.TZ || "America/New_York",
      } as any
    );

    // Start the scheduled tasks
    this.leadPollingTask.start();
    this.followUpTask.start();
    this.isRunning = true;

    logger.info(
      `Background job scheduler started with patterns: lead polling: ${leadPollingPattern}, follow-ups: ${followUpPattern}`
    );
  }

  /**
   * Stop the background job scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Background job scheduler is not running");
      return;
    }

    logger.info("Stopping background job scheduler...");

    if (this.leadPollingTask) {
      this.leadPollingTask.stop();
      this.leadPollingTask.destroy();
      this.leadPollingTask = null;
    }

    if (this.followUpTask) {
      this.followUpTask.stop();
      this.followUpTask.destroy();
      this.followUpTask = null;
    }

    this.isRunning = false;
    logger.info("Background job scheduler stopped");
  }

  /**
   * Execute the lead polling job
   */
  private async executeLeadPollingJob(): Promise<void> {
    const jobStartTime = Date.now();
    logger.backgroundJob("Starting scheduled lead polling job", "lead-polling");

    try {
      // Create lead poller instance
      const leadPoller = createLeadPoller();

      // Poll and import leads
      const pollingResult = await leadPoller.pollAndImportLeads();

      logger.backgroundJob("Lead polling completed", "lead-polling", {
        processingTime: `${Date.now() - jobStartTime}ms`,
        totalProcessed: pollingResult.totalProcessed,
        newLeads: pollingResult.newLeads,
        duplicatesSkipped: pollingResult.duplicatesSkipped,
        errors: pollingResult.errors.length,
      });

      // If we have new leads, send notifications
      if (pollingResult.newLeads > 0) {
        logger.backgroundJob(
          `Processing notifications for ${pollingResult.newLeads} new leads`,
          "notifications"
        );
        await this.sendNotificationsForNewLeads();
      }
    } catch (error) {
      logger.error("Scheduled lead polling job failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Log the error to the database for monitoring
      try {
        await prisma.notificationLog.create({
          data: {
            type: "EMAIL",
            recipient: process.env.ADMIN_EMAIL || "ardabasoglu@gmail.com",
            subject: "Lead Polling Job Failed",
            content: `Lead polling job failed at ${new Date().toISOString()}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (logError) {
        logger.error("Failed to log error to database", {
          error: logError instanceof Error ? logError.message : "Unknown error",
        });
      }
    }
  }

  /**
   * Send notifications for newly imported leads
   */
  private async sendNotificationsForNewLeads(): Promise<void> {
    try {
      // Get newly imported leads that need notifications
      // Look for leads imported in the last 20 minutes to catch the current batch
      const newLeads = await prisma.lead.findMany({
        where: {
          status: "PENDING",
          intakeToken: { not: null },
          importedAt: {
            gte: new Date(Date.now() - 20 * 60 * 1000), // Last 20 minutes
          },
          // Only get leads that haven't had notifications sent yet
          notificationLog: {
            none: {
              type: "EMAIL",
              status: "SENT",
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

      if (newLeads.length === 0) {
        logger.info("No new leads found that need notifications");
        return;
      }

      logger.info(`Found ${newLeads.length} leads to send notifications to`);

      // Track notification results
      const notificationResults = {
        emailsSent: 0,
        smsSent: 0,
        emailErrors: 0,
        smsErrors: 0,
      };

      // Send notifications for each new lead
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

        // Add a small delay between notifications to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.backgroundJob(
        "Notification sending completed",
        "notifications",
        notificationResults
      );
    } catch (error) {
      logger.error("Failed to send notifications for new leads", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Execute the follow-up processing job
   */
  private async executeFollowUpJob(): Promise<void> {
    const jobStartTime = Date.now();
    logger.backgroundJob(
      "Starting scheduled follow-up processing job",
      "follow-ups"
    );

    try {
      // Process the follow-up queue
      const result = await followUpScheduler.processFollowUpQueue();

      logger.backgroundJob("Follow-up processing completed", "follow-ups", {
        processingTime: `${Date.now() - jobStartTime}ms`,
        processed: result.processed,
        sent: result.sent,
        cancelled: result.cancelled,
        errors: result.errors.length,
      });
    } catch (error) {
      logger.error("Scheduled follow-up processing job failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime: `${Date.now() - jobStartTime}ms`,
      });
    }
  }

  /**
   * Get the current status of the scheduler
   */
  getStatus(): {
    isRunning: boolean;
    leadPollingPattern: string;
    followUpPattern: string;
    nextLeadPolling?: Date;
    nextFollowUp?: Date;
  } {
    return {
      isRunning: this.isRunning,
      leadPollingPattern:
        process.env.LEAD_POLLING_CRON_PATTERN || "*/15 * * * *",
      followUpPattern: process.env.FOLLOWUP_CRON_PATTERN || "*/5 * * * *",
      nextLeadPolling: this.leadPollingTask
        ? (this.leadPollingTask as any).nextDate()?.toDate()
        : undefined,
      nextFollowUp: this.followUpTask
        ? (this.followUpTask as any).nextDate()?.toDate()
        : undefined,
    };
  }

  /**
   * Execute lead polling job manually (for testing)
   */
  async executeLeadPollingManually(): Promise<void> {
    logger.backgroundJob("Executing lead polling job manually", "lead-polling");
    await this.executeLeadPollingJob();
  }

  /**
   * Execute follow-up processing job manually (for testing)
   */
  async executeFollowUpManually(): Promise<void> {
    logger.backgroundJob(
      "Executing follow-up processing job manually",
      "follow-ups"
    );
    await this.executeFollowUpJob();
  }
}

// Export singleton instance
export const backgroundJobScheduler = new BackgroundJobScheduler();
