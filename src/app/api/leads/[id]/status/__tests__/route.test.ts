import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { leadStatusService } from '@/services/LeadStatusService';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/services/LeadStatusService');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockLeadStatusService = leadStatusService as jest.Mocked<typeof leadStatusService>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/leads/[id]/status GET', () => {
  const mockSession = {
    user: { id: 1, email: 'test@example.com' },
  };

  const mockLead = {
    id: 1,
    status: LeadStatus.PENDING,
  };

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

  const mockTransitions = [
    {
      status: LeadStatus.IN_PROGRESS,
      description: 'Actively working with prospect',
      requiresReason: false,
    },
    {
      status: LeadStatus.COMPLETED,
      description: 'Successfully closed/funded',
      requiresReason: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
    mockLeadStatusService.getLeadStatusHistory.mockResolvedValue({
      success: true,
      history: mockHistory,
    });
    mockLeadStatusService.getAvailableTransitions.mockReturnValue(mockTransitions);
  });

  it('should return status information for authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads/1/status');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      currentStatus: LeadStatus.PENDING,
      history: mockHistory,
      availableTransitions: mockTransitions,
    });

    expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, status: true },
    });
    expect(mockLeadStatusService.getLeadStatusHistory).toHaveBeenCalledWith(1);
    expect(mockLeadStatusService.getAvailableTransitions).toHaveBeenCalledWith(LeadStatus.PENDING);
  });

  it('should return 401 for unauthenticated user', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/1/status');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid lead ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads/invalid/status');
    const response = await GET(request, { params: { id: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid lead ID');
  });

  it('should return 404 for non-existent lead', async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/999/status');
    const response = await GET(request, { params: { id: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lead not found');
  });

  it('should return 500 when status history service fails', async () => {
    mockLeadStatusService.getLeadStatusHistory.mockResolvedValue({
      success: false,
      error: 'Database error',
    });

    const request = new NextRequest('http://localhost:3000/api/leads/1/status');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should handle service errors gracefully', async () => {
    mockLeadStatusService.getLeadStatusHistory.mockRejectedValue(
      new Error('Unexpected error')
    );

    const request = new NextRequest('http://localhost:3000/api/leads/1/status');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});