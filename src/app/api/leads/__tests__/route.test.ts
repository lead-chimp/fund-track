import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = {
  lead: {
    findMany: prisma.lead.findMany as jest.MockedFunction<typeof prisma.lead.findMany>,
    count: prisma.lead.count as jest.MockedFunction<typeof prisma.lead.count>,
  },
};

describe('/api/leads GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return leads with default pagination', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    
    const mockLeads = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: LeadStatus.NEW,
        _count: { notes: 2, documents: 1 },
      },
    ];

    mockPrisma.lead.findMany.mockResolvedValue(mockLeads as any);
    mockPrisma.lead.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leads).toEqual(mockLeads);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      totalCount: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('should handle search parameter', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/leads?search=john');
    await GET(request);

    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { firstName: { contains: 'john', mode: 'insensitive' } },
          { lastName: { contains: 'john', mode: 'insensitive' } },
          { email: { contains: 'john', mode: 'insensitive' } },
          { phone: { contains: 'john', mode: 'insensitive' } },
          { businessName: { contains: 'john', mode: 'insensitive' } },
        ],
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            notes: true,
            documents: true,
          },
        },
      },
    });
  });

  it('should handle status filter', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/leads?status=pending');
    await GET(request);

    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      where: {
        status: LeadStatus.PENDING,
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            notes: true,
            documents: true,
          },
        },
      },
    });
  });

  it('should handle date range filter', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    const dateFrom = '2024-01-01';
    const dateTo = '2024-12-31';
    const request = new NextRequest(`http://localhost:3000/api/leads?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    await GET(request);

    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            notes: true,
            documents: true,
          },
        },
      },
    });
  });

  it('should handle pagination parameters', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(25);

    const request = new NextRequest('http://localhost:3000/api/leads?page=3&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 10, // (3-1) * 5
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            notes: true,
            documents: true,
          },
        },
      },
    });

    expect(data.pagination).toEqual({
      page: 3,
      limit: 5,
      totalCount: 25,
      totalPages: 5,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('should return 400 for invalid pagination parameters', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);

    const request = new NextRequest('http://localhost:3000/api/leads?page=0&limit=101');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid pagination parameters');
  });

  it('should handle database errors', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: '1' } } as any);
    mockPrisma.lead.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});