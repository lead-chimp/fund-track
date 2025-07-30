import { TokenService } from '../TokenService';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = TokenService.generateToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = TokenService.generateToken();
      const token2 = TokenService.generateToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateToken', () => {
    it('should return null for non-existent token', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await TokenService.validateToken('invalid-token');

      expect(result).toBeNull();
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: { intakeToken: 'invalid-token' },
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
    });

    it('should return null for lead without intake token', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        status: 'NEW',
        intakeToken: null,
        intakeCompletedAt: null,
        step1CompletedAt: null,
        step2CompletedAt: null,
      });

      const result = await TokenService.validateToken('valid-token');

      expect(result).toBeNull();
    });

    it('should return intake session for valid token', async () => {
      const mockLead = {
        id: 1,
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        status: 'PENDING',
        intakeToken: 'valid-token',
        intakeCompletedAt: null,
        step1CompletedAt: null,
        step2CompletedAt: null,
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const result = await TokenService.validateToken('valid-token');

      expect(result).toEqual({
        leadId: 1,
        token: 'valid-token',
        isValid: true,
        isCompleted: false,
        step1Completed: false,
        step2Completed: false,
        lead: {
          id: 1,
          email: 'test@example.com',
          phone: '1234567890',
          firstName: 'John',
          lastName: 'Doe',
          businessName: 'Test Business',
          status: 'PENDING',
        },
      });
    });

    it('should return completed status when intake is completed', async () => {
      const mockLead = {
        id: 1,
        email: 'test@example.com',
        phone: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'Test Business',
        status: 'COMPLETED',
        intakeToken: 'valid-token',
        intakeCompletedAt: new Date(),
        step1CompletedAt: new Date(),
        step2CompletedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const result = await TokenService.validateToken('valid-token');

      expect(result?.isCompleted).toBe(true);
      expect(result?.step1Completed).toBe(true);
      expect(result?.step2Completed).toBe(true);
    });
  });

  describe('generateTokenForLead', () => {
    it('should generate token and update lead status', async () => {
      mockPrisma.lead.update.mockResolvedValue({} as any);

      const result = await TokenService.generateTokenForLead(1);

      expect(result).toHaveLength(64);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          intakeToken: expect.any(String),
          status: 'PENDING',
        },
      });
    });

    it('should return null on database error', async () => {
      mockPrisma.lead.update.mockRejectedValue(new Error('Database error'));

      const result = await TokenService.generateTokenForLead(1);

      expect(result).toBeNull();
    });
  });

  describe('markStep1Completed', () => {
    it('should update step1CompletedAt timestamp', async () => {
      mockPrisma.lead.update.mockResolvedValue({} as any);

      const result = await TokenService.markStep1Completed(1);

      expect(result).toBe(true);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { step1CompletedAt: expect.any(Date) },
      });
    });

    it('should return false on database error', async () => {
      mockPrisma.lead.update.mockRejectedValue(new Error('Database error'));

      const result = await TokenService.markStep1Completed(1);

      expect(result).toBe(false);
    });
  });

  describe('markStep2Completed', () => {
    it('should update step2CompletedAt and intakeCompletedAt timestamps', async () => {
      mockPrisma.lead.update.mockResolvedValue({} as any);

      const result = await TokenService.markStep2Completed(1);

      expect(result).toBe(true);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          step2CompletedAt: expect.any(Date),
          intakeCompletedAt: expect.any(Date),
        },
      });
    });

    it('should return false on database error', async () => {
      mockPrisma.lead.update.mockRejectedValue(new Error('Database error'));

      const result = await TokenService.markStep2Completed(1);

      expect(result).toBe(false);
    });
  });

  describe('getIntakeProgress', () => {
    it('should return progress for existing lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        step1CompletedAt: new Date(),
        step2CompletedAt: null,
        intakeCompletedAt: null,
      });

      const result = await TokenService.getIntakeProgress(1);

      expect(result).toEqual({
        step1Completed: true,
        step2Completed: false,
        intakeCompleted: false,
      });
    });

    it('should return null for non-existent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await TokenService.getIntakeProgress(1);

      expect(result).toBeNull();
    });
  });
});