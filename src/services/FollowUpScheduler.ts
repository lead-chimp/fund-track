import { prisma } from '@/lib/prisma';
import { notificationService } from './NotificationService';
import { logger } from '@/lib/logger';
import { FollowupType, FollowupStatus, LeadStatus } from '@prisma/client';

export interface FollowUpScheduleResult {
  success: boolean;
  scheduledCount: number;
  errors: string[];
}

export interface FollowUpProcessResult {
  success: boolean;
  processed: number;
  sent: number;
  cancelled: number;
  errors: string[];
}

export class FollowUpScheduler {
  // Follow-up intervals in milliseconds
  private readonly followUpIntervals = {
    [FollowupType.THREE_HOUR]: 3 * 60 * 60 * 1000,    // 3 hours
    [FollowupType.NINE_HOUR]: 9 * 60 * 60 * 1000,     // 9 hours
    [FollowupType.TWENTY_FOUR_H]: 24 * 60 * 60 * 1000, // 24 hours
    [FollowupType.SEVENTY_TWO_H]: 72 * 60 * 60 * 1000  // 72 hours
  };

  /**
   * Schedule follow-ups for a lead when it's imported
   */
  async scheduleFollowUpsForLead(leadId: number): Promise<FollowUpScheduleResult> {
    const result: FollowUpScheduleResult = {
      success: true,
      scheduledCount: 0,
      errors: []
    };

    try {
      // Get the lead to verify it exists and is in pending status
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, status: true, firstName: true, lastName: true }
      });

      if (!lead) {
        result.success = false;
        result.errors.push(`Lead with ID ${leadId} not found`);
        return result;
      }

      if (lead.status !== LeadStatus.PENDING) {
        logger.info(`Skipping follow-up scheduling for lead ${leadId} - status is ${lead.status}, not PENDING`);
        return result;
      }

      // Check if follow-ups are already scheduled for this lead
      const existingFollowUps = await prisma.followupQueue.findMany({
        where: { 
          leadId,
          status: FollowupStatus.PENDING
        }
      });

      if (existingFollowUps.length > 0) {
        logger.info(`Follow-ups already scheduled for lead ${leadId}, skipping`);
        return result;
      }

      const now = new Date();
      const followUpsToSchedule = [
        FollowupType.THREE_HOUR,
        FollowupType.NINE_HOUR,
        FollowupType.TWENTY_FOUR_H,
        FollowupType.SEVENTY_TWO_H
      ];

      // Schedule each follow-up
      for (const followUpType of followUpsToSchedule) {
        try {
          const scheduledAt = new Date(now.getTime() + this.followUpIntervals[followUpType]);
          
          await prisma.followupQueue.create({
            data: {
              leadId,
              followupType: followUpType,
              scheduledAt,
              status: FollowupStatus.PENDING
            }
          });

          result.scheduledCount++;
          logger.info(`Scheduled ${followUpType} follow-up for lead ${leadId} at ${scheduledAt.toISOString()}`);
        } catch (error) {
          const errorMsg = `Failed to schedule ${followUpType} follow-up for lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      logger.info(`Follow-up scheduling completed for lead ${leadId}`, {
        leadId,
        scheduledCount: result.scheduledCount,
        errors: result.errors.length
      });

    } catch (error) {
      result.success = false;
      const errorMsg = `Failed to schedule follow-ups for lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * Cancel all pending follow-ups for a lead (when status changes from pending)
   */
  async cancelFollowUpsForLead(leadId: number): Promise<boolean> {
    try {
      const result = await prisma.followupQueue.updateMany({
        where: {
          leadId,
          status: FollowupStatus.PENDING
        },
        data: {
          status: FollowupStatus.CANCELLED
        }
      });

      if (result.count > 0) {
        logger.info(`Cancelled ${result.count} pending follow-ups for lead ${leadId}`);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to cancel follow-ups for lead ${leadId}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Process the follow-up queue and send due notifications
   */
  async processFollowUpQueue(): Promise<FollowUpProcessResult> {
    const result: FollowUpProcessResult = {
      success: true,
      processed: 0,
      sent: 0,
      cancelled: 0,
      errors: []
    };

    try {
      const now = new Date();
      
      // Get all pending follow-ups that are due
      const dueFollowUps = await prisma.followupQueue.findMany({
        where: {
          status: FollowupStatus.PENDING,
          scheduledAt: {
            lte: now
          }
        },
        include: {
          lead: {
            select: {
              id: true,
              status: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              businessName: true,
              intakeToken: true
            }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      logger.info(`Found ${dueFollowUps.length} due follow-ups to process`);

      for (const followUp of dueFollowUps) {
        result.processed++;

        try {
          // Check if lead status is still pending
          if (followUp.lead.status !== LeadStatus.PENDING) {
            // Cancel this follow-up since lead is no longer pending
            await prisma.followupQueue.update({
              where: { id: followUp.id },
              data: { status: FollowupStatus.CANCELLED }
            });
            
            result.cancelled++;
            logger.info(`Cancelled follow-up ${followUp.id} - lead ${followUp.leadId} status is ${followUp.lead.status}`);
            continue;
          }

          // Send the follow-up notifications
          const sendResult = await this.sendFollowUpNotifications(followUp);
          
          if (sendResult.success) {
            // Mark follow-up as sent
            await prisma.followupQueue.update({
              where: { id: followUp.id },
              data: {
                status: FollowupStatus.SENT,
                sentAt: new Date()
              }
            });
            
            result.sent++;
            logger.info(`Successfully sent ${followUp.followupType} follow-up for lead ${followUp.leadId}`);
          } else {
            result.errors.push(`Failed to send follow-up ${followUp.id}: ${sendResult.errors.join(', ')}`);
            logger.error(`Failed to send follow-up ${followUp.id}`, { errors: sendResult.errors });
          }

        } catch (error) {
          const errorMsg = `Error processing follow-up ${followUp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      logger.info('Follow-up queue processing completed', {
        processed: result.processed,
        sent: result.sent,
        cancelled: result.cancelled,
        errors: result.errors.length
      });

    } catch (error) {
      result.success = false;
      const errorMsg = `Failed to process follow-up queue: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * Send follow-up notifications for a specific follow-up queue item
   */
  private async sendFollowUpNotifications(followUp: any): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let emailSent = false;
    let smsSent = false;

    if (!followUp.lead.intakeToken) {
      errors.push('Lead has no intake token');
      return { success: false, errors };
    }

    const intakeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/application/${followUp.lead.intakeToken}`;
    const leadName = followUp.lead.firstName && followUp.lead.lastName 
      ? `${followUp.lead.firstName} ${followUp.lead.lastName}` 
      : followUp.lead.businessName || 'there';

    // Get follow-up message based on type
    const messages = this.getFollowUpMessages(followUp.followupType, leadName, intakeUrl);

    // Send email if available
    if (followUp.lead.email) {
      try {
        const emailResult = await notificationService.sendEmail({
          to: followUp.lead.email,
          subject: messages.emailSubject,
          text: messages.emailText,
          html: messages.emailHtml,
          leadId: followUp.lead.id
        });

        if (emailResult.success) {
          emailSent = true;
        } else {
          errors.push(`Email failed: ${emailResult.error}`);
        }
      } catch (error) {
        errors.push(`Email error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Send SMS if available
    if (followUp.lead.phone) {
      try {
        const smsResult = await notificationService.sendSMS({
          to: followUp.lead.phone,
          message: messages.smsText,
          leadId: followUp.lead.id
        });

        if (smsResult.success) {
          smsSent = true;
        } else {
          errors.push(`SMS failed: ${smsResult.error}`);
        }
      } catch (error) {
        errors.push(`SMS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Consider success if at least one notification was sent
    const success = emailSent || smsSent;
    
    if (!success && errors.length === 0) {
      errors.push('No email or phone number available for follow-up');
    }

    return { success, errors };
  }

  /**
   * Get follow-up messages based on the follow-up type
   */
  private getFollowUpMessages(followUpType: FollowupType, leadName: string, intakeUrl: string) {
    const baseMessages = {
      [FollowupType.THREE_HOUR]: {
        emailSubject: 'Quick Reminder: Complete Your Fund Track Application',
        urgency: 'We wanted to follow up quickly',
        timeframe: 'just a few hours ago'
      },
      [FollowupType.NINE_HOUR]: {
        emailSubject: 'Don\'t Miss Out: Your Fund Track Application',
        urgency: 'We noticed you haven\'t completed',
        timeframe: 'earlier today'
      },
      [FollowupType.TWENTY_FOUR_H]: {
        emailSubject: 'Final Reminder: Complete Your Application Today',
        urgency: 'This is a friendly reminder',
        timeframe: 'yesterday'
      },
      [FollowupType.SEVENTY_TWO_H]: {
        emailSubject: 'Last Chance: Your Fund Track Application Expires Soon',
        urgency: 'This is your final reminder',
        timeframe: 'a few days ago'
      }
    };

    const message = baseMessages[followUpType];

    return {
      emailSubject: message.emailSubject,
      emailText: `Hi ${leadName},

${message.urgency} your merchant funding application that you started ${message.timeframe}.

Complete your application now: ${intakeUrl}

Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.

If you have any questions, please don't hesitate to contact us.

Best regards,
Fund Track Team`,
      emailHtml: `
        <h2>${message.emailSubject}</h2>
        <p>Hi ${leadName},</p>
        <p>${message.urgency} your merchant funding application that you started ${message.timeframe}.</p>
        <p><a href="${intakeUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Application Now</a></p>
        <p>Don't miss this opportunity to secure funding for your business. The application only takes a few minutes to complete.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Fund Track Team</p>
      `,
      smsText: `Hi ${leadName}! ${message.urgency} your merchant funding application. Complete it now: ${intakeUrl}`
    };
  }

  /**
   * Get follow-up statistics for monitoring
   */
  async getFollowUpStats() {
    const stats = await prisma.followupQueue.groupBy({
      by: ['followupType', 'status'],
      _count: true
    });

    const totalPending = await prisma.followupQueue.count({
      where: { status: FollowupStatus.PENDING }
    });

    const dueSoon = await prisma.followupQueue.count({
      where: {
        status: FollowupStatus.PENDING,
        scheduledAt: {
          lte: new Date(Date.now() + 60 * 60 * 1000) // Due within 1 hour
        }
      }
    });

    return {
      totalPending,
      dueSoon,
      breakdown: stats.reduce((acc, stat) => {
        const key = `${stat.followupType}_${stat.status}`;
        acc[key] = stat._count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clean up old completed/cancelled follow-ups (for maintenance)
   */
  async cleanupOldFollowUps(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await prisma.followupQueue.deleteMany({
      where: {
        status: {
          in: [FollowupStatus.SENT, FollowupStatus.CANCELLED]
        },
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${result.count} old follow-up records older than ${daysOld} days`);
    return result.count;
  }
}

// Export singleton instance
export const followUpScheduler = new FollowUpScheduler();