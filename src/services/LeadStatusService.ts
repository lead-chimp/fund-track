import { prisma } from '@/lib/prisma';
import { followUpScheduler } from './FollowUpScheduler';
import { notificationService } from './NotificationService';
import { logger } from '@/lib/logger';
import { LeadStatus } from '@prisma/client';

export interface StatusChangeRequest {
  leadId: number;
  newStatus: LeadStatus;
  changedBy: number;
  reason?: string;
}

export interface StatusChangeResult {
  success: boolean;
  lead?: any;
  error?: string;
  followUpsCancelled?: boolean;
  staffNotificationSent?: boolean;
}

export interface StatusTransitionRule {
  from: LeadStatus;
  to: LeadStatus[];
  requiresReason?: boolean;
  description: string;
}

export class LeadStatusService {
  // Define valid status transitions
  private readonly statusTransitions: StatusTransitionRule[] = [
    {
      from: LeadStatus.NEW,
      to: [LeadStatus.PENDING, LeadStatus.IN_PROGRESS, LeadStatus.REJECTED],
      description: 'New leads can be set to pending, in progress, or rejected'
    },
    {
      from: LeadStatus.PENDING,
      to: [LeadStatus.IN_PROGRESS, LeadStatus.COMPLETED, LeadStatus.REJECTED],
      description: 'Pending leads can progress to in progress, completed, or be rejected'
    },
    {
      from: LeadStatus.IN_PROGRESS,
      to: [LeadStatus.COMPLETED, LeadStatus.REJECTED, LeadStatus.PENDING],
      description: 'In progress leads can be completed, rejected, or moved back to pending'
    },
    {
      from: LeadStatus.COMPLETED,
      to: [LeadStatus.IN_PROGRESS],
      requiresReason: true,
      description: 'Completed leads can only be reopened to in progress with a reason'
    },
    {
      from: LeadStatus.REJECTED,
      to: [LeadStatus.PENDING, LeadStatus.IN_PROGRESS],
      requiresReason: true,
      description: 'Rejected leads can be reopened to pending or in progress with a reason'
    }
  ];

  /**
   * Validate if a status transition is allowed
   */
  validateStatusTransition(currentStatus: LeadStatus, newStatus: LeadStatus, reason?: string): { valid: boolean; error?: string } {
    // Allow same status (no change)
    if (currentStatus === newStatus) {
      return { valid: true };
    }

    const rule = this.statusTransitions.find(r => r.from === currentStatus);
    if (!rule) {
      return { valid: false, error: `No transition rules defined for status: ${currentStatus}` };
    }

    if (!rule.to.includes(newStatus)) {
      return { 
        valid: false, 
        error: `Invalid transition from ${currentStatus} to ${newStatus}. ${rule.description}` 
      };
    }

    if (rule.requiresReason && !reason?.trim()) {
      return { 
        valid: false, 
        error: `Reason is required when changing from ${currentStatus} to ${newStatus}` 
      };
    }

    return { valid: true };
  }

  /**
   * Change lead status with full audit logging and automation
   */
  async changeLeadStatus(request: StatusChangeRequest): Promise<StatusChangeResult> {
    const { leadId, newStatus, changedBy, reason } = request;

    try {
      // Get current lead data
      const currentLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          status: true,
          firstName: true,
          lastName: true,
          businessName: true,
          email: true,
          phone: true
        }
      });

      if (!currentLead) {
        return { success: false, error: 'Lead not found' };
      }

      // Validate the status transition
      const validation = this.validateStatusTransition(currentLead.status, newStatus, reason);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // If no change, return success without doing anything
      if (currentLead.status === newStatus) {
        return { success: true, lead: currentLead };
      }

      // Perform the status change in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the lead status
        const updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: { status: newStatus },
          include: {
            notes: {
              include: {
                user: {
                  select: { id: true, email: true }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            documents: {
              include: {
                user: {
                  select: { id: true, email: true }
                }
              },
              orderBy: { uploadedAt: 'desc' }
            },
            statusHistory: {
              include: {
                user: {
                  select: { id: true, email: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10 // Get last 10 status changes
            },
            _count: {
              select: {
                notes: true,
                documents: true,
                followupQueue: true
              }
            }
          }
        });

        // Create status history record
        await tx.leadStatusHistory.create({
          data: {
            leadId,
            previousStatus: currentLead.status,
            newStatus,
            changedBy,
            reason: reason?.trim() || null
          }
        });

        return updatedLead;
      });

      // Handle follow-up cancellation if status changed from PENDING
      let followUpsCancelled = false;
      if (currentLead.status === LeadStatus.PENDING && newStatus !== LeadStatus.PENDING) {
        try {
          const cancelled = await followUpScheduler.cancelFollowUpsForLead(leadId);
          followUpsCancelled = cancelled;
          
          if (cancelled) {
            logger.info(`Cancelled follow-ups for lead ${leadId} due to status change from ${currentLead.status} to ${newStatus}`);
          }
        } catch (error) {
          logger.error(`Failed to cancel follow-ups for lead ${leadId}:`, error);
          // Don't fail the entire operation if follow-up cancellation fails
        }
      }

      // Send staff notification for important status changes
      let staffNotificationSent = false;
      try {
        staffNotificationSent = await this.sendStaffStatusChangeNotification(
          result,
          currentLead.status,
          newStatus,
          changedBy,
          reason
        );
      } catch (error) {
        logger.error(`Failed to send staff notification for lead ${leadId} status change:`, error);
        // Don't fail the operation if notification fails
      }

      logger.info(`Lead ${leadId} status changed from ${currentLead.status} to ${newStatus} by user ${changedBy}`, {
        leadId,
        previousStatus: currentLead.status,
        newStatus,
        changedBy,
        reason,
        followUpsCancelled,
        staffNotificationSent
      });

      return {
        success: true,
        lead: result,
        followUpsCancelled,
        staffNotificationSent
      };

    } catch (error) {
      logger.error(`Failed to change status for lead ${leadId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send notification to staff about important status changes
   */
  private async sendStaffStatusChangeNotification(
    lead: any,
    previousStatus: LeadStatus,
    newStatus: LeadStatus,
    changedBy: number,
    reason?: string
  ): Promise<boolean> {
    // Only send notifications for significant status changes
    const significantChanges = [
      { from: LeadStatus.NEW, to: LeadStatus.IN_PROGRESS },
      { from: LeadStatus.PENDING, to: LeadStatus.IN_PROGRESS }, // Documents uploaded, ready for review
      { from: LeadStatus.PENDING, to: LeadStatus.COMPLETED },
      { from: LeadStatus.IN_PROGRESS, to: LeadStatus.COMPLETED },
      { from: LeadStatus.COMPLETED, to: LeadStatus.IN_PROGRESS }, // Reopened
      { from: LeadStatus.REJECTED, to: LeadStatus.PENDING }, // Reopened
      { from: LeadStatus.REJECTED, to: LeadStatus.IN_PROGRESS } // Reopened
    ];

    const isSignificant = significantChanges.some(
      change => change.from === previousStatus && change.to === newStatus
    );

    if (!isSignificant) {
      return false;
    }

    try {
      // Get the user who made the change
      const user = await prisma.user.findUnique({
        where: { id: changedBy },
        select: { email: true }
      });

      if (!user) {
        logger.warn(`User ${changedBy} not found for status change notification`);
        return false;
      }

      // Get admin users to notify
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true }
      });

      if (adminUsers.length === 0) {
        logger.warn('No admin users found to send status change notification');
        return false;
      }

      const leadName = lead.firstName && lead.lastName 
        ? `${lead.firstName} ${lead.lastName}` 
        : lead.businessName || `Lead #${lead.id}`;

      const subject = `Lead Status Update: ${leadName} - ${previousStatus} → ${newStatus}`;
      
      let emailContent = `
        <h3>Lead Status Change Notification</h3>
        <p><strong>Lead:</strong> ${leadName} (#${lead.id})</p>
        <p><strong>Status Change:</strong> ${previousStatus} → ${newStatus}</p>
        <p><strong>Changed By:</strong> ${user.email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `;

      if (reason) {
        emailContent += `<p><strong>Reason:</strong> ${reason}</p>`;
      }

      if (lead.email) {
        emailContent += `<p><strong>Lead Email:</strong> ${lead.email}</p>`;
      }

      if (lead.phone) {
        emailContent += `<p><strong>Lead Phone:</strong> ${lead.phone}</p>`;
      }

      emailContent += `
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/leads/${lead.id}">View Lead Details</a></p>
      `;

      // Send notification to all admin users
      let notificationsSent = 0;
      for (const admin of adminUsers) {
        try {
          const result = await notificationService.sendEmail({
            to: admin.email,
            subject,
            html: emailContent,
            text: emailContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            leadId: lead.id
          });

          if (result.success) {
            notificationsSent++;
          }
        } catch (error) {
          logger.error(`Failed to send status change notification to ${admin.email}:`, error);
        }
      }

      logger.info(`Sent status change notifications to ${notificationsSent}/${adminUsers.length} admin users for lead ${lead.id}`);
      return notificationsSent > 0;

    } catch (error) {
      logger.error('Failed to send staff status change notification:', error);
      return false;
    }
  }

  /**
   * Get status history for a lead
   */
  async getLeadStatusHistory(leadId: number) {
    try {
      const history = await prisma.leadStatusHistory.findMany({
        where: { leadId },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return { success: true, history };
    } catch (error) {
      logger.error(`Failed to get status history for lead ${leadId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get available status transitions for a lead
   */
  getAvailableTransitions(currentStatus: LeadStatus): { status: LeadStatus; description: string; requiresReason: boolean }[] {
    const rule = this.statusTransitions.find(r => r.from === currentStatus);
    if (!rule) {
      return [];
    }

    return rule.to.map(status => ({
      status,
      description: this.getStatusDescription(status),
      requiresReason: rule.requiresReason || false
    }));
  }

  /**
   * Get human-readable description for a status
   */
  private getStatusDescription(status: LeadStatus): string {
    const descriptions = {
      [LeadStatus.NEW]: 'New lead, not yet contacted',
      [LeadStatus.PENDING]: 'Awaiting prospect response or action',
      [LeadStatus.IN_PROGRESS]: 'Actively working with prospect',
      [LeadStatus.COMPLETED]: 'Successfully closed/funded',
      [LeadStatus.REJECTED]: 'Lead declined or not qualified'
    };

    return descriptions[status] || status;
  }

  /**
   * Get status change statistics
   */
  async getStatusChangeStats(days: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await prisma.leadStatusHistory.groupBy({
        by: ['previousStatus', 'newStatus'],
        where: {
          createdAt: {
            gte: cutoffDate
          }
        },
        _count: true
      });

      const totalChanges = await prisma.leadStatusHistory.count({
        where: {
          createdAt: {
            gte: cutoffDate
          }
        }
      });

      return {
        success: true,
        totalChanges,
        transitions: stats.map(stat => ({
          from: stat.previousStatus,
          to: stat.newStatus,
          count: stat._count
        }))
      };
    } catch (error) {
      logger.error('Failed to get status change statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const leadStatusService = new LeadStatusService();