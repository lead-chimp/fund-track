import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { withErrorHandler, AuthenticationError, ValidationError } from '@/lib/errors';
import { executeDatabaseOperation } from '@/lib/database-error-handler';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AuthenticationError();
  }

  logger.apiRequest('GET', '/api/leads', undefined, undefined, {
    userId: session.user?.email,
  });

  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') as LeadStatus | null;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
  
  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    throw new ValidationError('Invalid pagination parameters', 'pagination');
  }

  const skip = (page - 1) * limit;

  // Build where clause for filtering
  const where: any = {};

  // Search filter (name, email, phone, business name)
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (status) {
    // Map URL parameter to enum value
    const statusMap: Record<string, LeadStatus> = {
      'new': LeadStatus.NEW,
      'pending': LeadStatus.PENDING,
      'in_progress': LeadStatus.IN_PROGRESS,
      'completed': LeadStatus.COMPLETED,
      'rejected': LeadStatus.REJECTED,
    };
    
    if (statusMap[status]) {
      where.status = statusMap[status];
    }
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  // Build orderBy clause
  const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'businessName', 'status', 'email'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy: any = { [orderByField]: sortOrder };

  // Execute queries with error handling
  const [leads, totalCount] = await executeDatabaseOperation(
    () => Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              notes: true,
              documents: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]),
    'fetch_leads_with_pagination',
    'leads'
  );

  const totalPages = Math.ceil(totalCount / limit);
  const duration = Date.now() - startTime;

  logger.apiRequest('GET', '/api/leads', 200, duration, {
    userId: session.user?.email,
    resultsCount: leads.length,
    totalCount,
    page,
    limit,
  });

  return NextResponse.json({
    leads,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});