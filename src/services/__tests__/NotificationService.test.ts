import { NotificationService, EmailNotification, SMSNotification } from '../NotificationService';
import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationStatus } from '@prisma/client';

// Mock external dependencies
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: {
        create: jest.fn(),
      },
    }),
  }));
});

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notificationLog: {
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    TWILIO_ACCOUNT_SID: 'test_account_sid',
    TWILIO_AUTH_TOKEN: 'test_auth_token',
    TWILIO_PHONE_NUMBER: '+1234567890',
    MAILGUN_API_KEY: 'test_mailgun_key',
    MAILGUN_DOMAIN: 'test.mailgun.com',
    MAILGUN_FROM_EMAIL: 'test@example.com',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockTwilioClient: any;
  let mockMailgunClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocked clients before creating the service
    const twilio = require('twilio');
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };
    twilio.mockReturnValue(mockTwilioClient);
    
    const Mailgun = require('mailgun.js');
    mockMailgunClient = {
      messages: {
        create: jest.fn(),
      },
    };
    const mailgunInstance = {
      client: jest.fn().mockReturnValue(mockMailgunClient),
    };
    Mailgun.mockReturnValue(mailgunInstance);
    
    // Create new instance
    notificationService = new NotificationService();
    
    // Mock the sleep method to avoid actual delays in tests
    jest.spyOn(notificationService as any, 'sleep').mockResolvedValue(undefined);
  });

  describe('Configuration Validation', () => {
    it('should validate configuration successfully with all required env vars', () => {
      const result = notificationService.validateConfiguration();
      expect(result).toBe(true);
    });

    it('should fail validation when required env vars are missing', () => {
      const originalSid = process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_ACCOUNT_SID;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = notificationService.validateConfiguration();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Missing required environment variables:',
        ['TWILIO_ACCOUNT_SID']
      );
      
      process.env.TWILIO_ACCOUNT_SID = originalSid;
      consoleSpy.mockRestore();
    });
  });

  describe('Email Notifications', () => {
    const emailNotification: EmailNotification = {
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test message',
      html: '<p>Test message</p>',
      leadId: 1,
    };

    it('should send email successfully', async () => {
      // Mock successful Mailgun response
      mockMailgunClient.messages.create.mockResolvedValue({
        id: 'mailgun_message_id_123',
      });

      // Mock database operations
      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const result = await notificationService.sendEmail(emailNotification);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('mailgun_message_id_123');
      
      // Verify database operations
      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          type: NotificationType.EMAIL,
          recipient: 'test@example.com',
          subject: 'Test Subject',
          content: 'Test message',
          status: NotificationStatus.PENDING,
        },
      });

      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: NotificationStatus.SENT,
          externalId: 'mailgun_message_id_123',
          sentAt: expect.any(Date),
        },
      });

      // Verify Mailgun API call
      expect(mockMailgunClient.messages.create).toHaveBeenCalledWith(
        'test.mailgun.com',
        {
          from: 'test@example.com',
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: '<p>Test message</p>',
        }
      );
    });

    it('should handle email sending failure', async () => {
      const error = new Error('Mailgun API error');
      mockMailgunClient.messages.create.mockRejectedValue(error);

      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const result = await notificationService.sendEmail(emailNotification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mailgun API error');

      // Verify failure is logged
      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: 'Mailgun API error',
        },
      });
    });

    it('should retry email sending with exponential backoff', async () => {
      // Mock first two calls to fail, third to succeed
      mockMailgunClient.messages.create
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValue({ id: 'success_id' });

      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await notificationService.sendEmail(emailNotification);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('success_id');
      expect(mockMailgunClient.messages.create).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });
  });

  describe('SMS Notifications', () => {
    const smsNotification: SMSNotification = {
      to: '+1234567890',
      message: 'Test SMS message',
      leadId: 1,
    };

    it('should send SMS successfully', async () => {
      // Mock successful Twilio response
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'twilio_message_sid_123',
      });

      // Mock database operations
      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const result = await notificationService.sendSMS(smsNotification);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('twilio_message_sid_123');
      
      // Verify database operations
      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          type: NotificationType.SMS,
          recipient: '+1234567890',
          content: 'Test SMS message',
          status: NotificationStatus.PENDING,
        },
      });

      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: NotificationStatus.SENT,
          externalId: 'twilio_message_sid_123',
          sentAt: expect.any(Date),
        },
      });

      // Verify Twilio API call
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Test SMS message',
        from: '+1234567890',
        to: '+1234567890',
      });
    });

    it('should handle SMS sending failure', async () => {
      const error = new Error('Twilio API error');
      mockTwilioClient.messages.create.mockRejectedValue(error);

      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const result = await notificationService.sendSMS(smsNotification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio API error');

      // Verify failure is logged
      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: 'Twilio API error',
        },
      });
    });

    it('should retry SMS sending with exponential backoff', async () => {
      // Mock first call to fail, second to succeed
      mockTwilioClient.messages.create
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({ sid: 'success_sid' });

      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await notificationService.sendSMS(smsNotification);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('success_sid');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    it('should fail after maximum retries', async () => {
      const error = new Error('Persistent error');
      mockTwilioClient.messages.create.mockRejectedValue(error);

      (prisma.notificationLog.create as jest.Mock).mockResolvedValue({
        id: 1,
      });
      (prisma.notificationLog.update as jest.Mock).mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await notificationService.sendSMS(smsNotification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent error');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(consoleSpy).toHaveBeenCalledTimes(3); // 3 retry warnings
      
      consoleSpy.mockRestore();
    });
  });

  describe('Notification Statistics', () => {
    it('should get notification stats for a lead', async () => {
      const mockStats = [
        { type: 'EMAIL', status: 'SENT', _count: 5 },
        { type: 'EMAIL', status: 'FAILED', _count: 1 },
        { type: 'SMS', status: 'SENT', _count: 3 },
      ];

      (prisma.notificationLog.groupBy as jest.Mock).mockResolvedValue(mockStats);

      const stats = await notificationService.getNotificationStats(1);

      expect(stats).toEqual({
        EMAIL_SENT: 5,
        EMAIL_FAILED: 1,
        SMS_SENT: 3,
      });

      expect(prisma.notificationLog.groupBy).toHaveBeenCalledWith({
        by: ['type', 'status'],
        where: { leadId: 1 },
        _count: true,
      });
    });

    it('should get recent notifications', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'EMAIL',
          recipient: 'test@example.com',
          status: 'SENT',
          createdAt: new Date(),
          lead: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
          },
        },
      ];

      (prisma.notificationLog.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      const notifications = await notificationService.getRecentNotifications(10);

      expect(notifications).toEqual(mockNotifications);
      expect(prisma.notificationLog.findMany).toHaveBeenCalledWith({
        take: 10,
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
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff correctly', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const sleepSpy = jest.spyOn(notificationService as any, 'sleep').mockResolvedValue(undefined);

      // Access private method for testing
      const result = await (notificationService as any).executeWithRetry(mockFn, 'test');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(sleepSpy).toHaveBeenCalledTimes(2);
      
      // Verify exponential backoff delays
      expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000); // 1 second
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000); // 2 seconds
      
      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });

    it('should respect maximum delay', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const sleepSpy = jest.spyOn(notificationService as any, 'sleep').mockResolvedValue(undefined);

      try {
        await (notificationService as any).executeWithRetry(mockFn, 'test');
      } catch (error) {
        // Expected to throw after retries
      }

      // Verify that delays don't exceed maxDelay (30000ms)
      const calls = sleepSpy.mock.calls;
      calls.forEach(call => {
        expect(call[0]).toBeLessThanOrEqual(30000);
      });
      
      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });
  });
});