import twilio from 'twilio';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationStatus } from '@prisma/client';

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
   * Validate configuration on startup
   */
  validateConfiguration(): boolean {
    const requiredEnvVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_FROM_EMAIL',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
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