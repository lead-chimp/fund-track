import { BackgroundJobScheduler } from '../BackgroundJobScheduler';
import { createLeadPoller } from '../LeadPoller';
import { notificationService } from '../NotificationService';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('../LeadPoller');
jest.mock('../NotificationService', () => ({
  notificationService: {
    sendEmail: jest.fn(),
    sendSMS: jest.fn(),
    validateConfiguration: jest.fn(() => true),
  },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    backgroundJob: jest.fn(),
    notification: jest.fn(),
  },
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    nextDate: jest.fn(() => ({ toDate: () => new Date() })),
  })),
}));

const mockCreateLeadPoller = createLeadPoller as jest.MockedFunction<typeof createLeadPoller>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Cast individual Prisma methods as Jest mocks
const mockLeadFindMany = prisma.lead.findMany as jest.MockedFunction<typeof prisma.lead.findMany>;
const mockNotificationLogCreate = prisma.notificationLog.create as jest.MockedFunction<typeof prisma.notificationLog.create>;

describe('BackgroundJobScheduler', () => {
  let scheduler: BackgroundJobScheduler;
  let mockLeadPoller: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock lead poller
    mockLeadPoller = {
      pollAndImportLeads: jest.fn(),
    };
    mockCreateLeadPoller.mockReturnValue(mockLeadPoller);

    // Reset mock notification service
    (notificationService.sendEmail as jest.Mock).mockReset();
    (notificationService.sendSMS as jest.Mock).mockReset();

    scheduler = new BackgroundJobScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('start and stop', () => {
    it('should start the scheduler successfully', () => {
      scheduler.start();
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should stop the scheduler successfully', () => {
      scheduler.start();
      scheduler.stop();
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      scheduler.start();
      scheduler.start(); // Second call should be ignored
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });

  describe('executeLeadPollingManually', () => {
    it('should execute lead polling job manually', async () => {
      const mockPollingResult = {
        totalProcessed: 5,
        newLeads: 2,
        duplicatesSkipped: 3,
        errors: [],
        processingTime: 1000,
      };

      mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

      // Mock leads for notification
      mockLeadFindMany.mockResolvedValue([
        {
          id: 1,
          email: 'test@example.com',
          phone: '1234567890',
          firstName: 'John',
          lastName: 'Doe',
          businessName: 'Test Business',
          intakeToken: 'test-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          legacyLeadId: BigInt(0),
          campaignId: 0,
          status: 'NEW',
          intakeCompletedAt: null,
          step1CompletedAt: null,
          step2CompletedAt: null,
          importedAt: new Date()
        },
      ]);

      // Mock successful notifications
      (notificationService.sendEmail as jest.Mock).mockResolvedValue({ success: true, externalId: 'email-123' });
      (notificationService.sendSMS as jest.Mock).mockResolvedValue({ success: true, externalId: 'sms-123' });

      await scheduler.executeLeadPollingManually();

      expect(mockLeadPoller.pollAndImportLeads).toHaveBeenCalledTimes(1);
      expect(mockLeadFindMany).toHaveBeenCalledTimes(1);
      expect(notificationService.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationService.sendSMS).toHaveBeenCalledTimes(1);
    });

    it('should handle polling errors gracefully', async () => {
      const error = new Error('Polling failed');
      mockLeadPoller.pollAndImportLeads.mockRejectedValue(error);

      // Mock database error logging
      mockNotificationLogCreate.mockResolvedValue({} as any);

      await scheduler.executeLeadPollingManually();

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'EMAIL',
          subject: 'Lead Polling Job Failed',
          status: 'FAILED',
          errorMessage: 'Polling failed',
        }),
      });
    });

    it('should skip notifications when no new leads', async () => {
      const mockPollingResult = {
        totalProcessed: 5,
        newLeads: 0,
        duplicatesSkipped: 5,
        errors: [],
        processingTime: 1000,
      };

      mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

      await scheduler.executeLeadPollingManually();

      expect(mockLeadFindMany).not.toHaveBeenCalled();
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
      expect(notificationService.sendSMS).not.toHaveBeenCalled();
    });

    it('should handle notification failures gracefully', async () => {
      const mockPollingResult = {
        totalProcessed: 1,
        newLeads: 1,
        duplicatesSkipped: 0,
        errors: [],
        processingTime: 1000,
      };

      mockLeadPoller.pollAndImportLeads.mockResolvedValue(mockPollingResult);

      // Mock leads for notification
      mockLeadFindMany.mockResolvedValue([
        {
          id: 1,
          email: 'test@example.com',
          phone: '1234567890',
          firstName: 'John',
          lastName: 'Doe',
          businessName: 'Test Business',
          intakeToken: 'test-token-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          legacyLeadId: BigInt(0),
          campaignId: 0,
          status: 'NEW',
          intakeCompletedAt: null,
          step1CompletedAt: null,
          step2CompletedAt: null,
          importedAt: new Date()
        },
      ]);

      // Mock failed notifications
      (notificationService.sendEmail as jest.Mock).mockResolvedValue({ success: false, error: 'Email failed' });
      (notificationService.sendSMS as jest.Mock).mockResolvedValue({ success: false, error: 'SMS failed' });

      await scheduler.executeLeadPollingManually();

      expect(notificationService.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationService.sendSMS).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when not running', () => {
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.leadPollingPattern).toBe('*/15 * * * *');
      expect(status.followUpPattern).toBe('*/5 * * * *');
    });

    it('should return correct status when running', () => {
      scheduler.start();
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.leadPollingPattern).toBe('*/15 * * * *');
      expect(status.followUpPattern).toBe('*/5 * * * *');
      expect(status.nextLeadPolling).toBeInstanceOf(Date);
      expect(status.nextFollowUp).toBeInstanceOf(Date);
    });
  });
});