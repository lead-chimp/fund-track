import { NextRequest } from 'next/server'
import { GET } from '../route'
import { setupTestDatabase, cleanupDatabase, testDataFactory } from '../../../../../tests/setup/database'
import { getServerSession } from 'next-auth'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/leads Integration Tests', () => {
  let prisma: any

  beforeAll(async () => {
    prisma = await setupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    
    // Mock authenticated user
    mockGetServerSession.mockResolvedValue({
      user: { id: 1, email: 'test@example.com', role: 'admin' }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /api/leads', () => {
    it('should return leads with pagination', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: testDataFactory.user()
      })

      // Create test leads
      await prisma.lead.createMany({
        data: [
          testDataFactory.lead({ firstName: 'John', lastName: 'Doe' }),
          testDataFactory.lead({ firstName: 'Jane', lastName: 'Smith' }),
        ]
      })

      const request = new NextRequest('http://localhost:3000/api/leads?page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.page).toBe(1)
      expect(data.totalPages).toBe(1)
    })

    it('should filter leads by search term', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: testDataFactory.user()
      })

      // Create test leads
      await prisma.lead.createMany({
        data: [
          testDataFactory.lead({ firstName: 'John', lastName: 'Doe', businessName: 'Acme Corp' }),
          testDataFactory.lead({ firstName: 'Jane', lastName: 'Smith', businessName: 'Tech Solutions' }),
        ]
      })

      const request = new NextRequest('http://localhost:3000/api/leads?search=Acme')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toHaveLength(1)
      expect(data.leads[0].businessName).toBe('Acme Corp')
    })

    it('should filter leads by status', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: testDataFactory.user()
      })

      // Create test leads
      await prisma.lead.createMany({
        data: [
          testDataFactory.lead({ status: 'NEW' }),
          testDataFactory.lead({ status: 'IN_PROGRESS' }),
        ]
      })

      const request = new NextRequest('http://localhost:3000/api/leads?status=NEW')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toHaveLength(1)
      expect(data.leads[0].status).toBe('NEW')
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/leads')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})