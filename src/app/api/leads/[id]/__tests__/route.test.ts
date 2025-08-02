import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET, PUT } from '../route';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { leadStatusService } from '@/services/LeadStatusService';

// Mock the leadStatusService
jest.mock('@/services/LeadStatusService', () => ({
  leadStatusService: {
    changeLeadStatus: jest.fn(),
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockLeadStatusService = leadStatusService as jest.Mocked<typeof leadStatusService>;
const mockPrisma = {
  lead: {
    findUnique: prisma.lead.findUnique as jest.MockedFunction<typeof prisma.lead.findUnique>,
    update: prisma.lead.update as jest.MockedFunction<typeof prisma.lead.update>,
  },
};

describe('/api/leads/[id] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/1');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid lead ID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);

    const request = new NextRequest('http://localhost:3000/api/leads/invalid');
    const response = await GET(request, { params: { id: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid lead ID');
  });

  it('should return 404 if lead not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/999');
    const response = await GET(request, { params: { id: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lead not found');
  });

  it('should return lead with details', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    
    const mockLead = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: LeadStatus.NEW,
      legacyLeadId: null,
      notes: [
        {
          id: 1,
          content: 'Test note',
          user: { id: 1, email: 'admin@example.com' },
        },
      ],
      documents: [],
      _count: { notes: 1, documents: 0, followupQueue: 0 },
    };

    mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);

    const request = new NextRequest('http://localhost:3000/api/leads/1');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lead).toEqual(mockLead);
    expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        notes: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            notes: true,
            documents: true,
            followupQueue: true,
          },
        },
      },
    });
  });

  it('should handle database errors', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/leads/1');
    const response = await GET(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('/api/leads/[id] PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({ status: LeadStatus.IN_PROGRESS }),
    });
    const response = await PUT(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid lead ID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);

    const request = new NextRequest('http://localhost:3000/api/leads/invalid', {
      method: 'PUT',
      body: JSON.stringify({ status: LeadStatus.IN_PROGRESS }),
    });
    const response = await PUT(request, { params: { id: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid lead ID');
  });

  it('should return 400 for invalid status', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'invalid_status' }),
    });
    const response = await PUT(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid status value');
  });

  it('should return 400 for invalid email format', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({ email: 'invalid-email' }),
    });
    const response = await PUT(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
  });

  it('should return 404 if lead not found', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads/999', {
      method: 'PUT',
      body: JSON.stringify({ status: LeadStatus.IN_PROGRESS }),
    });
    const response = await PUT(request, { params: { id: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lead not found');
  });

  it('should update lead successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    
    const existingLead = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      status: LeadStatus.NEW,
    };

    const updatedLead = {
      ...existingLead,
      status: LeadStatus.IN_PROGRESS,
      firstName: 'Jane',
      legacyLeadId: null,
      notes: [],
      documents: [],
      _count: { notes: 0, documents: 0, followupQueue: 0 },
    };

    mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
    mockPrisma.lead.update.mockResolvedValue(updatedLead as any);
    
    // Mock the status service for status changes
    mockLeadStatusService.changeLeadStatus.mockResolvedValue({
      success: true,
      lead: updatedLead,
      followUpsCancelled: false,
      staffNotificationSent: false,
    });

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({
        status: LeadStatus.IN_PROGRESS,
        firstName: 'Jane',
      }),
    });
    const response = await PUT(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lead).toEqual(updatedLead);
    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: LeadStatus.IN_PROGRESS,
        firstName: 'Jane',
      },
      include: {
        notes: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
        },
        _count: {
          select: {
            notes: true,
            documents: true,
            followupQueue: true,
          },
        },
      },
    });
  });

  it('should handle partial updates', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    
    const existingLead = { id: 1, status: LeadStatus.NEW };
    const updatedLead = { ...existingLead, status: LeadStatus.COMPLETED };

    mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
    mockPrisma.lead.update.mockResolvedValue(updatedLead as any);

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({ status: LeadStatus.COMPLETED }),
    });
    await PUT(request, { params: { id: '1' } });

    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: LeadStatus.COMPLETED },
      include: expect.any(Object),
    });
  });

  it('should handle database errors', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/leads/1', {
      method: 'PUT',
      body: JSON.stringify({ status: LeadStatus.IN_PROGRESS }),
    });
    const response = await PUT(request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  describe('Status Change Functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetServerSession.mockResolvedValue({ user: { id: 1 } } as any);
    });

    it('should use status service for status changes', async () => {
      const existingLead = {
        id: 1,
        status: LeadStatus.NEW,
        firstName: 'John',
        lastName: 'Doe',
        legacyLeadId: null,
      };

      const updatedLead = {
        ...existingLead,
        status: LeadStatus.PENDING,
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
      mockLeadStatusService.changeLeadStatus.mockResolvedValue({
        success: true,
        lead: updatedLead,
        followUpsCancelled: false,
        staffNotificationSent: false,
      });

      const request = new NextRequest('http://localhost:3000/api/leads/1', {
        method: 'PUT',
        body: JSON.stringify({
          status: LeadStatus.PENDING,
          reason: 'Customer contacted',
        }),
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lead).toEqual(updatedLead);
      expect(data.followUpsCancelled).toBe(false);
      expect(data.staffNotificationSent).toBe(false);

      expect(mockLeadStatusService.changeLeadStatus).toHaveBeenCalledWith({
        leadId: 1,
        newStatus: LeadStatus.PENDING,
        changedBy: 1,
        reason: 'Customer contacted',
      });
    });

    it('should return error from status service for invalid transitions', async () => {
      const existingLead = {
        id: 1,
        status: LeadStatus.NEW,
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
      mockLeadStatusService.changeLeadStatus.mockResolvedValue({
        success: false,
        error: 'Invalid transition from NEW to COMPLETED',
      });

      const request = new NextRequest('http://localhost:3000/api/leads/1', {
        method: 'PUT',
        body: JSON.stringify({ status: LeadStatus.COMPLETED }),
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid transition from NEW to COMPLETED');
    });

    it('should handle status change with follow-up cancellation', async () => {
      const existingLead = {
        id: 1,
        status: LeadStatus.PENDING,
      };

      const updatedLead = {
        ...existingLead,
        status: LeadStatus.COMPLETED,
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
      mockLeadStatusService.changeLeadStatus.mockResolvedValue({
        success: true,
        lead: updatedLead,
        followUpsCancelled: true,
        staffNotificationSent: true,
      });

      const request = new NextRequest('http://localhost:3000/api/leads/1', {
        method: 'PUT',
        body: JSON.stringify({ status: LeadStatus.COMPLETED }),
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.followUpsCancelled).toBe(true);
      expect(data.staffNotificationSent).toBe(true);
    });

    it('should handle combined status and field updates', async () => {
      const existingLead = {
        id: 1,
        status: LeadStatus.NEW,
        firstName: 'John',
      };

      const statusChangedLead = {
        ...existingLead,
        status: LeadStatus.PENDING,
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      };

      const finalUpdatedLead = {
        ...statusChangedLead,
        firstName: 'Jane',
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
      mockLeadStatusService.changeLeadStatus.mockResolvedValue({
        success: true,
        lead: statusChangedLead,
        followUpsCancelled: false,
        staffNotificationSent: false,
      });
      mockPrisma.lead.update.mockResolvedValue(finalUpdatedLead as any);

      const request = new NextRequest('http://localhost:3000/api/leads/1', {
        method: 'PUT',
        body: JSON.stringify({
          status: LeadStatus.PENDING,
          firstName: 'Jane',
        }),
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLeadStatusService.changeLeadStatus).toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'Jane' },
        include: expect.any(Object),
      });
    });

    it('should handle no status change (same status)', async () => {
      const existingLead = {
        id: 1,
        status: LeadStatus.PENDING,
        firstName: 'John',
      };

      const updatedLead = {
        ...existingLead,
        firstName: 'Jane',
        notes: [],
        documents: [],
        statusHistory: [],
        _count: { notes: 0, documents: 0, followupQueue: 0 },
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead as any);
      mockPrisma.lead.update.mockResolvedValue(updatedLead as any);

      const request = new NextRequest('http://localhost:3000/api/leads/1', {
        method: 'PUT',
        body: JSON.stringify({
          status: LeadStatus.PENDING, // Same status
          firstName: 'Jane',
        }),
      });

      const response = await PUT(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLeadStatusService.changeLeadStatus).not.toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'Jane' },
        include: expect.any(Object),
      });
    });
  });
});