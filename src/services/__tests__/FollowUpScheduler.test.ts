import { FollowUpScheduler } from '../FollowUpScheduler';
import { prisma } from '@/lib/prisma';
import { notificationService } from '../NotificationService';
import { FollowupType, FollowupStatus, LeadStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
    },
    followupQueue: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../NotificationService', () => ({
  notificationService: {
    sendEmail: jest.fn(),
    sendSMS: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Cast individual Prisma methods as Jest mocks
const mockLeadFindUnique = prisma.lead.findUnique as jest.MockedFunction<typeof prisma.lead.findUnique>;
const mockFollowupQueueFindMany = prisma.followupQueue.findMany as jest.MockedFunction<typeof prisma.followupQueue.findMany>;
const mockFollowupQueueCreate = prisma.followupQueue.create as jest.MockedFunction<typeof prisma.followupQueue.create>;
const mockFollowupQueueUpdate = prisma.followupQueue.update as jest.MockedFunction<typeof prisma.followupQueue.update>;
const mockFollowupQueueUpdateMany = prisma.followupQueue.updateMany as jest.MockedFunction<typeof prisma.followupQueue.updateMany>;
const mockFollowupQueueCount = prisma.followupQueue.count as jest.MockedFunction<typeof prisma.followupQueue.count>;
const mockFollowupQueueGroupBy = prisma.followupQueue.groupBy as jest.MockedFunction<typeof prisma.followupQueue.groupBy>;
const mockFollowupQueueDeleteMany = prisma.followupQueue.deleteMany as jest.MockedFunction<typeof prisma.followupQueue.deleteMany>;

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('FollowUpScheduler', () => {
  let followUpScheduler: FollowUpScheduler;

  beforeEach(() => {
    followUpScheduler = new FollowUpScheduler();
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.com';
  });

  describe('scheduleFollowUpsForLead', () => {
    it('should schedule follow-ups for a pending lead', async () => {
      const leadId = 1;
      const mockLead = {
        id: leadId,
        status: LeadStatus.PENDING,
        firstName: 'John',
        lastName: 'Doe',
      };

      mockLeadFindUnique.mockResolvedValue(mockLead as any);
      mockFollowupQueueFindMany.mockResolvedValue([]);
      mockFollowupQueueCreate.mockResolvedValue({} as any);

      const result = await followUpScheduler.scheduleFollowUpsForLead(leadId);

      expect(result.success).toBe(true);
      expect(result.scheduledCount).toBe(4);
      expect(result.errors).toHaveLength(0);
      expect(mockFollowupQueueCreate).toHaveBeenCalledTimes(4);

      // Verify all follow-up types are scheduled
      const createCalls = mockFollowupQueueCreate.mock.calls;
      expect(createCalls[0][0].data.followupType).toBe(FollowupType.THREE_HOUR);
      expect(createCalls[1][0].data.followupType).toBe(FollowupType.NINE_HOUR);
      expect(createCalls[2][0].data.followupType).toBe(FollowupType.TWENTY_FOUR_H);
      expect(createCalls[3][0].data.followupType).toBe(FollowupType.SEVENTY_TWO_H);
    });

    it('should not schedule follow-ups for non-pending lead', async () => {
      const leadId = 1;
      const mockLead = {
        id: leadId,
        status: LeadStatus.COMPLETED,
        firstName: 'John',
        lastName: 'Doe',
      };

      mockLeadFindUnique.mockResolvedValue(mockLead as any);

      const result = await followUpScheduler.scheduleFollowUpsForLead(leadId);

      expect(result.success).toBe(true);
      expect(result.scheduledCount).toBe(0);
      expect(mockFollowupQueueCreate).not.toHaveBeenCalled();
    });

    it('should not schedule follow-ups if already exist', async () => {
      const leadId = 1;
      const mockLead = {
        id: leadId,
        status: LeadStatus.PENDING,
        firstName: 'John',
        lastName: 'Doe',
      };

      const existingFollowUps = [
        { id: 1, leadId, followupType: FollowupType.THREE_HOUR, status: FollowupStatus.PENDING },
      ];

      mockLeadFindUnique.mockResolvedValue(mockLead as any);
      mockFollowupQueueFindMany.mockResolvedValue(existingFollowUps as any);

      const result = await followUpScheduler.scheduleFollowUpsForLead(leadId);

      expect(result.success).toBe(true);
      expect(result.scheduledCount).toBe(0);
      expect(mockFollowupQueueCreate).not.toHaveBeenCalled();
    });

    it('should handle lead not found', async () => {
      const leadId = 999;

      mockLeadFindUnique.mockResolvedValue(null);

      const result = await followUpScheduler.scheduleFollowUpsForLead(leadId);

      expect(result.success).toBe(false);
      expect(result.scheduledCount).toBe(0);
      expect(result.errors).toContain('Lead with ID 999 not found');
    });
  });

  describe('cancelFollowUpsForLead', () => {
    it('should cancel pending follow-ups for a lead', async () => {
      const leadId = 1;

      mockFollowupQueueUpdateMany.mockResolvedValue({ count: 2 });

      const result = await followUpScheduler.cancelFollowUpsForLead(leadId);

      expect(result).toBe(true);
      expect(mockFollowupQueueUpdateMany).toHaveBeenCalledWith({
        where: {
          leadId,
          status: FollowupStatus.PENDING,
        },
        data: {
          status: FollowupStatus.CANCELLED,
        },
      });
    });

    it('should handle database error gracefully', async () => {
      const leadId = 1;

      mockFollowupQueueUpdateMany.mockRejectedValue(new Error('Database error'));

      const result = await followUpScheduler.cancelFollowUpsForLead(leadId);

      expect(result).toBe(false);
    });
  });

  describe('processFollowUpQueue', () => {
    it('should process due follow-ups and send notifications', async () => {
      const now = new Date();
      const dueFollowUps = [
        {
          id: 1,
          leadId: 1,
          followupType: FollowupType.THREE_HOUR,
          scheduledAt: new Date(now.getTime() - 1000),
          lead: {
            id: 1,
            status: LeadStatus.PENDING,
            email: 'test@example.com',
            phone: '+1234567890',
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'Test Business',
            intakeToken: 'test-token',
          },
        },
      ];

      mockFollowupQueueFindMany.mockResolvedValue(dueFollowUps as any);
      mockFollowupQueueUpdate.mockResolvedValue({} as any);
      mockNotificationService.sendEmail.mockResolvedValue({ success: true, externalId: 'email-123' });
      mockNotificationService.sendSMS.mockResolvedValue({ success: true, externalId: 'sms-123' });

      const result = await followUpScheduler.processFollowUpQueue();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.cancelled).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Quick Reminder: Complete Your Fund Track Application',
        text: expect.stringContaining('Hi John Doe'),
        html: expect.stringContaining('Hi John Doe'),
        leadId: 1,
      });

      expect(mockNotificationService.sendSMS).toHaveBeenCalledWith({
        to: '+1234567890',
        message: expect.stringContaining('Hi John Doe!'),
        leadId: 1,
      });

      expect(mockFollowupQueueUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: FollowupStatus.SENT,
          sentAt: expect.any(Date),
        },
      });
    });

    it('should cancel follow-ups for non-pending leads', async () => {
      const now = new Date();
      const dueFollowUps = [
        {
          id: 1,
          leadId: 1,
          followupType: FollowupType.THREE_HOUR,
          scheduledAt: new Date(now.getTime() - 1000),
          lead: {
            id: 1,
            status: LeadStatus.COMPLETED, // Not pending
            email: 'test@example.com',
            phone: '+1234567890',
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'Test Business',
            intakeToken: 'test-token',
          },
        },
      ];

      mockFollowupQueueFindMany.mockResolvedValue(dueFollowUps as any);
      mockFollowupQueueUpdate.mockResolvedValue({} as any);

      const result = await followUpScheduler.processFollowUpQueue();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.cancelled).toBe(1);

      expect(mockFollowupQueueUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: FollowupStatus.CANCELLED },
      });

      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
      expect(mockNotificationService.sendSMS).not.toHaveBeenCalled();
    });

    it('should handle notification failures', async () => {
      const now = new Date();
      const dueFollowUps = [
        {
          id: 1,
          leadId: 1,
          followupType: FollowupType.THREE_HOUR,
          scheduledAt: new Date(now.getTime() - 1000),
          lead: {
            id: 1,
            status: LeadStatus.PENDING,
            email: 'test@example.com',
            phone: '+1234567890',
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'Test Business',
            intakeToken: 'test-token',
          },
        },
      ];

      mockFollowupQueueFindMany.mockResolvedValue(dueFollowUps as any);
      mockNotificationService.sendEmail.mockResolvedValue({ success: false, error: 'Email failed' });
      mockNotificationService.sendSMS.mockResolvedValue({ success: false, error: 'SMS failed' });

      const result = await followUpScheduler.processFollowUpQueue();

      expect(result.success).toBe(false);
      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Email failed: Email failed, SMS failed: SMS failed');
    });

    it('should handle leads without contact information', async () => {
      const now = new Date();
      const dueFollowUps = [
        {
          id: 1,
          leadId: 1,
          followupType: FollowupType.THREE_HOUR,
          scheduledAt: new Date(now.getTime() - 1000),
          lead: {
            id: 1,
            status: LeadStatus.PENDING,
            email: null,
            phone: null,
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'Test Business',
            intakeToken: 'test-token',
          },
        },
      ];

      mockFollowupQueueFindMany.mockResolvedValue(dueFollowUps as any);

      const result = await followUpScheduler.processFollowUpQueue();

      expect(result.success).toBe(false);
      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No email or phone number available');

      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
      expect(mockNotificationService.sendSMS).not.toHaveBeenCalled();
    });
  });

  describe('getFollowUpStats', () => {
    it('should return follow-up statistics', async () => {
      const mockStats = [
        { followupType: FollowupType.THREE_HOUR, status: FollowupStatus.PENDING, _count: 5 },
        { followupType: FollowupType.THREE_HOUR, status: FollowupStatus.SENT, _count: 3 },
        { followupType: FollowupType.NINE_HOUR, status: FollowupStatus.PENDING, _count: 2 },
      ];

      mockFollowupQueueGroupBy.mockResolvedValue(mockStats as any);
      mockFollowupQueueCount
        .mockResolvedValueOnce(7) // totalPending
        .mockResolvedValueOnce(2); // dueSoon

      const result = await followUpScheduler.getFollowUpStats();

      expect(result.totalPending).toBe(7);
      expect(result.dueSoon).toBe(2);
      expect(result.breakdown).toEqual({
        'THREE_HOUR_PENDING': 5,
        'THREE_HOUR_SENT': 3,
        'NINE_HOUR_PENDING': 2,
      });
    });
  });

  describe('cleanupOldFollowUps', () => {
    it('should clean up old completed/cancelled follow-ups', async () => {
      mockFollowupQueueDeleteMany.mockResolvedValue({ count: 10 });

      const result = await followUpScheduler.cleanupOldFollowUps(30);

      expect(result).toBe(10);
      expect(mockFollowupQueueDeleteMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [FollowupStatus.SENT, FollowupStatus.CANCELLED],
          },
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});