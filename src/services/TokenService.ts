import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { followUpScheduler } from './FollowUpScheduler';
import { LeadStatusService } from './LeadStatusService';
import { logger } from '@/lib/logger';

export interface IntakeSession {
  leadId: number;
  token: string;
  isValid: boolean;
  isCompleted: boolean;
  step1Completed: boolean;
  step2Completed: boolean;
  lead: {
    id: number;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    status: string;
  };
}

export class TokenService {
  /**
   * Generate a secure random token for intake workflow
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate if a token exists and is valid for intake
   */
  static async validateToken(token: string): Promise<IntakeSession | null> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { intakeToken: token },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          businessName: true,
          status: true,
          intakeToken: true,
          intakeCompletedAt: true,
          step1CompletedAt: true,
          step2CompletedAt: true,
        },
      });

      if (!lead || !lead.intakeToken) {
        return null;
      }

      const isCompleted = lead.intakeCompletedAt !== null;
      const step1Completed = lead.step1CompletedAt !== null;
      const step2Completed = lead.step2CompletedAt !== null;

      return {
        leadId: lead.id,
        token: lead.intakeToken,
        isValid: true,
        isCompleted,
        step1Completed,
        step2Completed,
        lead: {
          id: lead.id,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          businessName: lead.businessName,
          status: lead.status,
        },
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Generate and assign intake token to a lead
   */
  static async generateTokenForLead(leadId: number): Promise<string | null> {
    try {
      const token = this.generateToken();

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          intakeToken: token,
          status: 'PENDING' // Set status to pending when token is generated
        },
      });

      return token;
    } catch (error) {
      console.error('Error generating token for lead:', error);
      return null;
    }
  }

  /**
   * Mark step 1 as completed for a lead
   */
  static async markStep1Completed(leadId: number): Promise<boolean> {
    try {
      await prisma.lead.update({
        where: { id: leadId },
        data: { step1CompletedAt: new Date() },
      });
      return true;
    } catch (error) {
      console.error('Error marking step 1 completed:', error);
      return false;
    }
  }

  /**
   * Mark step 2 as completed for a lead
   */
  static async markStep2Completed(leadId: number): Promise<boolean> {
    try {
      // First, mark the intake steps as completed
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          step2CompletedAt: new Date(),
          intakeCompletedAt: new Date() // Mark entire intake as completed
        },
      });

      // Cancel any pending follow-ups since intake is now completed
      try {
        await followUpScheduler.cancelFollowUpsForLead(leadId);
      } catch (error) {
        console.error(`Failed to cancel follow-ups for completed lead ${leadId}:`, error);
        // Don't fail the step completion if follow-up cancellation fails
      }

      // Change lead status to IN_PROGRESS to alert staff that it's ready for review
      try {
        // Get the first admin user to use for system-initiated changes
        const systemUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true }
        });

        if (!systemUser) {
          logger.error(`No admin user found for system-initiated status change for lead ${leadId}`);
        } else {
          const leadStatusService = new LeadStatusService();
          const statusChangeResult = await leadStatusService.changeLeadStatus({
            leadId,
            newStatus: 'IN_PROGRESS',
            changedBy: systemUser.id,
            reason: 'Intake completed - documents uploaded and ready for review'
          });

          if (!statusChangeResult.success) {
            logger.error(`Failed to change lead status to IN_PROGRESS for lead ${leadId}:`, statusChangeResult.error);
            // Don't fail the step completion if status change fails
          } else {
            logger.info(`Lead ${leadId} status changed to IN_PROGRESS after intake completion`);
          }
        }
      } catch (error) {
        logger.error(`Error changing lead status for completed intake ${leadId}:`, error);
        // Don't fail the step completion if status change fails
      }

      return true;
    } catch (error) {
      console.error('Error marking step 2 completed:', error);
      return false;
    }
  }

  /**
   * Get intake progress for a lead
   */
  static async getIntakeProgress(leadId: number): Promise<{
    step1Completed: boolean;
    step2Completed: boolean;
    intakeCompleted: boolean;
  } | null> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          step1CompletedAt: true,
          step2CompletedAt: true,
          intakeCompletedAt: true,
        },
      });

      if (!lead) {
        return null;
      }

      return {
        step1Completed: lead.step1CompletedAt !== null,
        step2Completed: lead.step2CompletedAt !== null,
        intakeCompleted: lead.intakeCompletedAt !== null,
      };
    } catch (error) {
      console.error('Error getting intake progress:', error);
      return null;
    }
  }
}