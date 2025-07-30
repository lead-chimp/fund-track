import { LeadStatusService } from '../LeadStatusService';
import { prisma } from '@/lib/prisma';
import { followUpScheduler } from '../FollowUpScheduler';
import { notificationService } from '../NotificationService';
import { LeadStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    leadStatusHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../FollowUpScheduler', () => ({
  followUpScheduler: {
    cancelFollowUpsForLead: jest.fn(),
  },
}));

jest.mock('../NotificationService', () => ({
  notificationService: {
    sendEmail: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFollowUpScheduler = followUpScheduler as jest.Mocked<typeof followUpScheduler>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('LeadStatusService', () => {
  let service: LeadStatusService;

  beforeEach(() => {
    service = new LeadStatusService();
    jest.clearAllMocks();
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions from NEW status', () => {
      const result = service.validateStatusTransition(LeadStatus.NEW, LeadStatus.PENDING);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow same status (no change)', () => {
      const result = service.validateStatusTransition(LeadStatus.NEW, LeadStatus.NEW);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid transitions', () => {
      const result = service.validateStatusTransition(LeadStatus.NEW, LeadStatus.COMPLETED);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should require reason for transitions from COMPLETED', () => {
      const resultWithoutReason = service.validateStatusTransition(
        LeadStatus.COMPLETED, 
        LeadStatus.IN_PROGRESS
      );
      expect(resultWithoutReason.valid).toBe(false);
      expect(resultWithoutReason.error).toContain('Reason is required');

      const resultWithReason = service.validateStatusTransition(
        LeadStatus.COMPLETED, 
        LeadStatus.IN_PROGRESS, 
        'Customer requested changes'
      );
      expect(resultWithReason.valid).toBe(true);
    });

    it('should require reason for transitions from REJECTED', () => {
      const resultWithoutReason = service.validateStatusTransition(
        LeadStatus.REJECTED, 
        LeadStatus.PENDING
      );
      expect(resultWithoutReason.valid).toBe(false);
      expect(resultWithoutReason.error).toContain('Reason is required');

      const resultWithReason = service.validateStatusTransition(
        LeadStatus.REJECTED, 
        LeadStatus.PENDING, 
        'New information provided'
      );
      expect(resultWithReason.valid).toBe(true);
    });
  });

  describe('changeLeadStatus', () => {
    const mockLead = {
      id: 1,
      status: LeadStatus.NEW,
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business',
      email: 'john@example.com',
      phone: '+1234567890',
    };

    const mockUpdatedLead = {
      ...mockLead,
      status: LeadStatus.PENDING,
      notes: [],
      documents: [],
      statusHistory: [],
      _count: { notes: 0, documents: 0, followupQueue: 0 },
    };

    beforeEach(() => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.lead.update.mockResolvedValue(mockUpdatedLead);
      mockPrisma.leadStatusHistory.create.mockResolvedValue({
        id: 1,
        leadId: 1,
        previousStatus: LeadStatus.NEW,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
        reason: null,
        createdAt: new Date(),
      });
    });

    it('should successfully change lead status', async () => {
      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(result.lead).toEqual(mockUpdatedLead);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: LeadStatus.PENDING },
        include: expect.any(Object),
      });
      expect(mockPrisma.leadStatusHistory.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.PENDING,
          changedBy: 1,
          reason: null,
        },
      });
    });

    it('should return error for non-existent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await service.changeLeadStatus({
        leadId: 999,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lead not found');
    });

    it('should return error for invalid transition', async () => {
      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.COMPLETED,
        changedBy: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should cancel follow-ups when status changes from PENDING', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
      });
      mockFollowUpScheduler.cancelFollowUpsForLead.mockResolvedValue(true);

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.IN_PROGRESS,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(result.followUpsCancelled).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).toHaveBeenCalledWith(1);
    });

    it('should not cancel follow-ups when status remains PENDING', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
      });

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).not.toHaveBeenCalled();
    });

    it('should handle follow-up cancellation failure gracefully', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
      });
      mockFollowUpScheduler.cancelFollowUpsForLead.mockRejectedValue(
        new Error('Follow-up service error')
      );

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.IN_PROGRESS,
        changedBy: 1,
      });

      expect(result.success).toBe(true); // Should still succeed
      expect(result.followUpsCancelled).toBe(false);
    });

    it('should send staff notifications for significant status changes', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'user@example.com',
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'admin@example.com' },
      ]);
      mockNotificationService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'test-id',
      });

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.COMPLETED,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(result.staffNotificationSent).toBe(true);
      expect(mockNotificationService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for NEW status', () => {
      const transitions = service.getAvailableTransitions(LeadStatus.NEW);
      
      expect(transitions).toHaveLength(3);
      expect(transitions.map(t => t.status)).toContain(LeadStatus.PENDING);
      expect(transitions.map(t => t.status)).toContain(LeadStatus.IN_PROGRESS);
      expect(transitions.map(t => t.status)).toContain(LeadStatus.REJECTED);
    });

    it('should indicate when reason is required', () => {
      const transitions = service.getAvailableTransitions(LeadStatus.COMPLETED);
      
      expect(transitions).toHaveLength(1);
      expect(transitions[0].status).toBe(LeadStatus.IN_PROGRESS);
      expect(transitions[0].requiresReason).toBe(true);
    });

    it('should return empty array for unknown status', () => {
      const transitions = service.getAvailableTransitions('UNKNOWN' as LeadStatus);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('getLeadStatusHistory', () => {
    it('should return status history for a lead', async () => {
      const mockHistory = [
        {
          id: 1,
          leadId: 1,
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.PENDING,
          changedBy: 1,
          reason: null,
          createdAt: new Date(),
          user: { id: 1, email: 'user@example.com' },
        },
      ];

      mockPrisma.leadStatusHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getLeadStatusHistory(1);

      expect(result.success).toBe(true);
      expect(result.history).toEqual(mockHistory);
      expect(mockPrisma.leadStatusHistory.findMany).toHaveBeenCalledWith({
        where: { leadId: 1 },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.leadStatusHistory.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.getLeadStatusHistory(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getStatusChangeStats', () => {
    it('should return status change statistics', async () => {
      const mockStats = [
        {
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.PENDING,
          _count: 5,
        },
        {
          previousStatus: LeadStatus.PENDING,
          newStatus: LeadStatus.COMPLETED,
          _count: 3,
        },
      ];

      mockPrisma.leadStatusHistory.groupBy.mockResolvedValue(mockStats);
      mockPrisma.leadStatusHistory.count.mockResolvedValue(8);

      const result = await service.getStatusChangeStats(30);

      expect(result.success).toBe(true);
      expect(result.totalChanges).toBe(8);
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0]).toEqual({
        from: LeadStatus.NEW,
        to: LeadStatus.PENDING,
        count: 5,
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.leadStatusHistory.groupBy.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.getStatusChangeStats(30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});