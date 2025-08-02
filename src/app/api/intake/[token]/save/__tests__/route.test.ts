import { NextRequest } from 'next/server';
import { POST } from '../route';
import { TokenService } from '@/services/TokenService';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/services/TokenService');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      update: jest.fn(),
    },
  },
}));

const mockTokenService = TokenService as jest.Mocked<typeof TokenService>;
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma');

describe('/api/intake/[token]/save', () => {
  const mockIntakeSession = {
    leadId: 1,
    token: 'test-token',
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
      status: 'pending',
    },
  };

  const validSaveData = {
    step: 1,
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      businessName: 'Test Business LLC',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should successfully save step 1 progress', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
      (mockPrisma.lead.update as jest.Mock).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Progress saved successfully');
      expect(data.data.step).toBe(1);
      expect(data.data.saved).toBe(true);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '5551234567',
          businessName: 'Test Business LLC',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should return 400 when token is missing', async () => {
      const request = new NextRequest('http://localhost/api/intake//save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
      });

      const response = await POST(request, { params: { token: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token is required');
    });

    it('should return 404 when token is invalid', async () => {
      mockTokenService.validateToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/intake/invalid-token/save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
      });

      const response = await POST(request, { params: { token: 'invalid-token' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should return 400 when intake is already completed', async () => {
      const completedSession = { ...mockIntakeSession, isCompleted: true };
      mockTokenService.validateToken.mockResolvedValue(completedSession);

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Intake process has already been completed');
    });

    it('should return 400 when step or data is missing', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

      const incompleteRequest = {
        step: 1,
        // data missing
      };

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(incompleteRequest),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Step and data are required');
    });

    it('should return 400 when required fields are missing for step 1', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

      const incompleteData = {
        step: 1,
        data: {
          firstName: 'John',
          // lastName missing
          email: 'john@example.com',
          phone: '555-123-4567',
          // businessName missing
        },
      };

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields for saving progress');
      expect(data.missingFields).toEqual(['lastName', 'businessName']);
    });

    it('should return 400 when email format is invalid', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

      const invalidEmailData = {
        step: 1,
        data: {
          ...validSaveData.data,
          email: 'invalid-email',
        },
      };

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email format');
    });

    it('should return 400 when phone format is invalid', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

      const invalidPhoneData = {
        step: 1,
        data: {
          ...validSaveData.data,
          phone: 'invalid-phone',
        },
      };

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(invalidPhoneData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid phone number format');
    });

    it('should return 400 for invalid step number', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);

      const invalidStepData = {
        step: 99,
        data: validSaveData.data,
      };

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(invalidStepData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid step number');
    });

    it('should handle database errors gracefully', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
      mockPrisma.lead.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
      });

      const response = await POST(request, { params: { token: 'test-token' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should not mark step as completed when saving progress', async () => {
      mockTokenService.validateToken.mockResolvedValue(mockIntakeSession);
      mockPrisma.lead.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/intake/test-token/save', {
        method: 'POST',
        body: JSON.stringify(validSaveData),
      });

      await POST(request, { params: { token: 'test-token' } });

      // Verify that step1CompletedAt is NOT set when saving progress
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.not.objectContaining({
          step1CompletedAt: expect.any(Date),
        }),
      });
    });
  });
});