import { LeadStatusService } from '../LeadStatusService';
import { followUpScheduler } from '../FollowUpScheduler';
import { prisma } from '@/lib/prisma';
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

describe('Status Change Integration Tests', () => {
  let service: LeadStatusService;

  beforeEach(() => {
    service = new LeadStatusService();
    jest.clearAllMocks();
  });

  describe('Follow-up Cancellation Integration', () => {
    const mockLead = {
      id: 1,
      status: LeadStatus.PENDING,
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business',
      email: 'john@example.com',
      phone: '+1234567890',
    };

    const mockUpdatedLead = {
      ...mockLead,
      status: LeadStatus.COMPLETED,
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
        previousStatus: LeadStatus.PENDING,
        newStatus: LeadStatus.COMPLETED,
        changedBy: 1,
        reason: null,
        createdAt: new Date(),
      });
    });

    it('should cancel follow-ups when lead status changes from PENDING to COMPLETED', async () => {
      mockFollowUpScheduler.cancelFollowUpsForLead.mockResolvedValue(true);

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.COMPLETED,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(result.followUpsCancelled).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).toHaveBeenCalledWith(1);
    });

    it('should cancel follow-ups when lead status changes from PENDING to IN_PROGRESS', async () => {
      const updatedLead = { ...mockUpdatedLead, status: LeadStatus.IN_PROGRESS };
      mockPrisma.lead.update.mockResolvedValue(updatedLead);
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

    it('should cancel follow-ups when lead status changes from PENDING to REJECTED', async () => {
      const updatedLead = { ...mockUpdatedLead, status: LeadStatus.REJECTED };
      mockPrisma.lead.update.mockResolvedValue(updatedLead);
      mockFollowUpScheduler.cancelFollowUpsForLead.mockResolvedValue(true);

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.REJECTED,
        changedBy: 1,
        reason: 'Not qualified',
      });

      expect(result.success).toBe(true);
      expect(result.followUpsCancelled).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).toHaveBeenCalledWith(1);
    });

    it('should not cancel follow-ups when lead status remains PENDING', async () => {
      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).not.toHaveBeenCalled();
    });

    it('should not cancel follow-ups when lead status changes from non-PENDING status', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.NEW,
      });

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.IN_PROGRESS,
        changedBy: 1,
      });

      expect(result.success).toBe(true);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).not.toHaveBeenCalled();
    });

    it('should handle follow-up cancellation failure gracefully', async () => {
      mockFollowUpScheduler.cancelFollowUpsForLead.mockRejectedValue(
        new Error('Follow-up service error')
      );

      const result = await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.COMPLETED,
        changedBy: 1,
      });

      expect(result.success).toBe(true); // Should still succeed
      expect(result.followUpsCancelled).toBe(false);
      expect(mockFollowUpScheduler.cancelFollowUpsForLead).toHaveBeenCalledWith(1);
    });
  });

  describe('Status Transition Validation Integration', () => {
    it('should validate complete workflow from NEW to COMPLETED', async () => {
      // Test NEW -> PENDING
      let result = service.validateStatusTransition(LeadStatus.NEW, LeadStatus.PENDING);
      expect(result.valid).toBe(true);

      // Test PENDING -> IN_PROGRESS
      result = service.validateStatusTransition(LeadStatus.PENDING, LeadStatus.IN_PROGRESS);
      expect(result.valid).toBe(true);

      // Test IN_PROGRESS -> COMPLETED
      result = service.validateStatusTransition(LeadStatus.IN_PROGRESS, LeadStatus.COMPLETED);
      expect(result.valid).toBe(true);

      // Test invalid direct transition NEW -> COMPLETED
      result = service.validateStatusTransition(LeadStatus.NEW, LeadStatus.COMPLETED);
      expect(result.valid).toBe(false);
    });

    it('should validate reopening workflow', async () => {
      // Test COMPLETED -> IN_PROGRESS (requires reason)
      let result = service.validateStatusTransition(LeadStatus.COMPLETED, LeadStatus.IN_PROGRESS);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reason is required');

      result = service.validateStatusTransition(
        LeadStatus.COMPLETED, 
        LeadStatus.IN_PROGRESS, 
        'Customer requested changes'
      );
      expect(result.valid).toBe(true);

      // Test REJECTED -> PENDING (requires reason)
      result = service.validateStatusTransition(LeadStatus.REJECTED, LeadStatus.PENDING);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reason is required');

      result = service.validateStatusTransition(
        LeadStatus.REJECTED, 
        LeadStatus.PENDING, 
        'New information provided'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should create audit log entry for every status change', async () => {
      const mockLead = {
        id: 1,
        status: LeadStatus.NEW,
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      });

      await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
        reason: 'Customer contacted',
      });

      expect(mockPrisma.leadStatusHistory.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          previousStatus: LeadStatus.NEW,
          newStatus: LeadStatus.PENDING,
          changedBy: 1,
          reason: 'Customer contacted',
        },
      });
    });

    it('should handle audit logging without reason', async () => {
      const mockLead = {
        id: 1,
        status: LeadStatus.NEW,
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING,
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      });

      await service.changeLeadStatus({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
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
  });
});