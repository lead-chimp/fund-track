import { POST } from '../notes/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
    },
    leadNote: {
      create: jest.fn(),
    },
  },
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/leads/[id]/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'test@example.com',
        role: 'USER' as const,
      },
    };

    const mockLead = {
      id: 1,
      legacyLeadId: BigInt(123),
      campaignId: 1,
      email: 'lead@example.com',
      phone: '555-0123',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business',
      status: 'NEW' as const,
      intakeToken: 'token123',
      intakeCompletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      importedAt: new Date(),
    };

    const mockNote = {
      id: 1,
      leadId: 1,
      userId: 1,
      content: 'Test note content',
      createdAt: new Date(),
      user: {
        id: 1,
        email: 'test@example.com',
      },
    };

    it('should create a note successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.leadNote.create.mockResolvedValue(mockNote);

      const request = {
        json: jest.fn().mockResolvedValue({ content: 'Test note content' }),
      } as any;

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toEqual(mockNote);
      expect(mockPrisma.leadNote.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          userId: 1,
          content: 'Test note content',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/leads/1/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test note content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid lead ID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/leads/invalid/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test note content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid lead ID');
    });

    it('should return 400 for empty content', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = {
        json: jest.fn().mockResolvedValue({ content: '' }),
      } as any;

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Note content is required');
    });

    it('should return 400 for content exceeding character limit', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const longContent = 'a'.repeat(5001); // Exceeds 5000 character limit
      const request = {
        json: jest.fn().mockResolvedValue({ content: longContent }),
      } as any;

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Note content cannot exceed 5000 characters');
    });

    it('should accept content at character limit', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.leadNote.create.mockResolvedValue(mockNote);

      const maxContent = 'a'.repeat(5000); // Exactly at 5000 character limit
      const request = {
        json: jest.fn().mockResolvedValue({ content: maxContent }),
      } as any;

      const response = await POST(request, { params: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockPrisma.leadNote.create).toHaveBeenCalledWith({
        data: {
          leadId: 1,
          userId: 1,
          content: maxContent,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return 404 if lead not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const request = {
        json: jest.fn().mockResolvedValue({ content: 'Test note content' }),
      } as any;

      const response = await POST(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lead not found');
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.leadNote.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/leads/1/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test note content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});