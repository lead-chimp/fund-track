import twilio from 'twilio';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { getNotificationSettings } from './SystemSettingsService';

// Types for notification requests
export interface EmailNotification {
  to: string;
  subject: string;
  text: string;
  html?: string;
  leadId?: number;
}

export interface SMSNotification {
  to: string;
  message: string;
  leadId?: number;
}

export interface NotificationResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

// Configuration interface
interface NotificationConfig {
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  mailgun: {
    apiKey: string;
    domain: string;
    fromEmail: string;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private mailgunClient: any = null;
  private config: NotificationConfig;


  constructor() {
    this.config = {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      },
      mailgun: {
        apiKey: process.env.MAILGUN_API_KEY || '',
        domain: process.env.MAILGUN_DOMAIN || '',
        fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
      },
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
      },
    };
  }

  /**
   * Initialize clients lazily
   */
  private initializeClients(): void {
    if (!this.twilioClient && this.config.twilio.accountSid && this.config.twilio.authToken) {
      this.twilioClient = twilio(this.config.twilio.accountSid, this.config.twilio.authToken);
    }

    if (!this.mailgunClient && this.config.mailgun.apiKey) {
      const mailgun = new Mailgun(formData);
      this.mailgunClient = mailgun.client({
        username: 'api',
        key: this.config.mailgun.apiKey,
      });
    }
  }

  /**
   * Send email notification with retry logic
   */
  async sendEmail(notification: EmailNotification): Promise<NotificationResult> {
    // Check if email notifications are enabled
    const settings = await getNotificationSettings();
    if (!settings.emailEnabled) {
      return {
        success: false,
        error: 'Email notifications are disabled',
      };
    }

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimit(notification.to, 'EMAIL', notification.leadId);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason,
      };
    }

    this.initializeClients();
    // Create notification log entry
    const logEntry = await prisma.notificationLog.create({
      data: {
        leadId: notification.leadId,
        type: NotificationType.EMAIL,
        recipient: notification.to,
        subject: notification.subject,
        content: notification.text,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      // Update retry config from settings
      this.config.retryConfig.maxRetries = settings.retryAttempts;
      this.config.retryConfig.baseDelay = settings.retryDelay;

      const result = await this.executeWithRetry(
        () => this.sendEmailInternal(notification),
        'email'
      );

      // Update log entry on success
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: NotificationStatus.SENT,
          externalId: result.externalId,
          sentAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      // Update log entry on failure
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS notification with retry logic
   */
  async sendSMS(notification: SMSNotification): Promise<NotificationResult> {
    // Check if SMS notifications are enabled
    const settings = await getNotificationSettings();
    if (!settings.smsEnabled) {
      return {
        success: false,
        error: 'SMS notifications are disabled',
      };
    }

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimit(notification.to, 'SMS', notification.leadId);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason,
      };
    }

    this.initializeClients();
    // Create notification log entry
    const logEntry = await prisma.notificationLog.create({
      data: {
        leadId: notification.leadId,
        type: NotificationType.SMS,
        recipient: notification.to,
        content: notification.message,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      // Update retry config from settings
      this.config.retryConfig.maxRetries = settings.retryAttempts;
      this.config.retryConfig.baseDelay = settings.retryDelay;

      const result = await this.executeWithRetry(
        () => this.sendSMSInternal(notification),
        'sms'
      );

      // Update log entry on success
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: NotificationStatus.SENT,
          externalId: result.externalId,
          sentAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      // Update log entry on failure
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Internal method to send email via Mailgun
   */
  private async sendEmailInternal(notification: EmailNotification): Promise<NotificationResult> {
    if (!this.mailgunClient) {
      throw new Error('Mailgun client not initialized');
    }

    const messageData = {
      from: this.config.mailgun.fromEmail,
      to: notification.to,
      subject: notification.subject,
      text: notification.text,
      ...(notification.html && { html: notification.html }),
    };

    const response = await this.mailgunClient.messages.create(
      this.config.mailgun.domain,
      messageData
    );

    return {
      success: true,
      externalId: response.id,
    };
  }

  /**
   * Internal method to send SMS via Twilio
   */
  private async sendSMSInternal(notification: SMSNotification): Promise<NotificationResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const message = await this.twilioClient.messages.create({
      body: notification.message,
      from: this.config.twilio.phoneNumber,
      to: notification.to,
    });

    return {
      success: true,
      externalId: message.sid,
    };
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on the last attempt
        if (attempt === this.config.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retryConfig.baseDelay * Math.pow(2, attempt),
          this.config.retryConfig.maxDelay
        );

        console.warn(
          `${operationType} notification attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check rate limiting to prevent spam notifications
   */
  private async checkRateLimit(
    recipient: string,
    type: 'EMAIL' | 'SMS',
    leadId?: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Check database for recent notifications to this recipient
      const recentNotifications = await prisma.notificationLog.count({
        where: {
          recipient,
          type: type as any,
          status: 'SENT',
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });

      // Allow max 2 notifications per hour per recipient
      if (recentNotifications >= 2) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${recentNotifications} notifications sent to ${recipient} in the last hour`,
        };
      }

      // If leadId is provided, check lead-specific limits
      if (leadId) {
        const leadNotificationsToday = await prisma.notificationLog.count({
          where: {
            leadId,
            type: type as any,
            status: 'SENT',
            createdAt: {
              gte: oneDayAgo,
            },
          },
        });

        // Allow max 10 notifications per day per lead
        if (leadNotificationsToday >= 10) {
          return {
            allowed: false,
            reason: `Daily limit exceeded: ${leadNotificationsToday} notifications sent to lead ${leadId} today`,
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // If rate limit check fails, allow the notification but log the error
      return { allowed: true };
    }
  }

  /**
   * Validate configuration on startup
   */
  async validateConfiguration(): Promise<boolean> {
    const requiredEmailVars = [
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_FROM_EMAIL',
    ];

    const requiredSmsVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
    ];

    const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);

    // Check SMS settings from database
    const settings = await getNotificationSettings();
    const missingSmsVars = settings.smsEnabled ? requiredSmsVars.filter(varName => !process.env[varName]) : [];

    if (missingEmailVars.length > 0) {
      console.error('Missing required email environment variables:', missingEmailVars);
      return false;
    }

    if (missingSmsVars.length > 0) {
      console.error('Missing required SMS environment variables (SMS is enabled):', missingSmsVars);
      return false;
    }

    // Try to initialize clients to validate configuration
    try {
      this.initializeClients();
      return true;
    } catch (error) {
      console.error('Failed to initialize notification clients:', error);
      return false;
    }
  }

  /**
   * Get notification statistics for a lead
   */
  async getNotificationStats(leadId: number) {
    const stats = await prisma.notificationLog.groupBy({
      by: ['type', 'status'],
      where: { leadId },
      _count: true,
    });

    return stats.reduce((acc, stat) => {
      const key = `${stat.type}_${stat.status}`;
      acc[key] = stat._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get recent notification logs for debugging
   */
  async getRecentNotifications(limit: number = 50) {
    return prisma.notificationLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();