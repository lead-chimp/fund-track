import { NextRequest } from 'next/server'
import { GET } from '../[token]/route'
import { POST as SavePOST } from '../[token]/save/route'
import { POST as Step1POST } from '../[token]/step1/route'
import { POST as Step2POST } from '../[token]/step2/route'
import { setupTestDatabase, cleanupDatabase, testDataFactory } from '../../../../../tests/setup/database'

describe('/api/intake Integration Tests', () => {
  let prisma: any

  beforeAll(async () => {
    prisma = await setupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /api/intake/[token]', () => {
    it('should return lead data for valid token', async () => {
      // Create test lead with intake token
      const lead = await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'valid-token-123',
          status: 'PENDING'
        })
      })

      const request = new NextRequest('http://localhost:3000/api/intake/valid-token-123')
      const response = await GET(request, { params: { token: 'valid-token-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.lead).toBeDefined()
      expect(data.lead.id).toBe(lead.id)
      expect(data.lead.firstName).toBe('John')
      expect(data.lead.lastName).toBe('Doe')
    })

    it('should return 404 for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/intake/invalid-token')
      const response = await GET(request, { params: { token: 'invalid-token' } })

      expect(response.status).toBe(404)
    })

    it('should return 400 for completed intake', async () => {
      // Create completed lead
      await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'completed-token',
          status: 'COMPLETED',
          intakeCompletedAt: new Date()
        })
      })

      const request = new NextRequest('http://localhost:3000/api/intake/completed-token')
      const response = await GET(request, { params: { token: 'completed-token' } })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/intake/[token]/save', () => {
    it('should save partial progress', async () => {
      const lead = await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'save-token-123',
          status: 'PENDING'
        })
      })

      const requestBody = {
        step: 1,
        data: {
          firstName: 'Updated John',
          lastName: 'Updated Doe',
          businessName: 'Updated Business'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/intake/save-token-123/save', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await SavePOST(request, { params: { token: 'save-token-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify data was saved
      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id }
      })
      expect(updatedLead.firstName).toBe('Updated John')
      expect(updatedLead.lastName).toBe('Updated Doe')
      expect(updatedLead.businessName).toBe('Updated Business')
    })
  })

  describe('POST /api/intake/[token]/step1', () => {
    it('should complete step 1 and update lead data', async () => {
      const lead = await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'step1-token-123',
          status: 'PENDING'
        })
      })

      const requestBody = {
        firstName: 'Step1 John',
        lastName: 'Step1 Doe',
        email: 'step1@example.com',
        phone: '+1987654321',
        businessName: 'Step1 Business'
      }

      const request = new NextRequest('http://localhost:3000/api/intake/step1-token-123/step1', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await Step1POST(request, { params: { token: 'step1-token-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify step 1 completion
      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id }
      })
      expect(updatedLead.firstName).toBe('Step1 John')
      expect(updatedLead.step1CompletedAt).toBeTruthy()
    })

    it('should validate required fields', async () => {
      await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'validation-token',
          status: 'PENDING'
        })
      })

      const requestBody = {
        firstName: '', // Missing required field
        lastName: 'Doe'
      }

      const request = new NextRequest('http://localhost:3000/api/intake/validation-token/step1', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await Step1POST(request, { params: { token: 'validation-token' } })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/intake/[token]/step2', () => {
    it('should handle document upload and complete intake', async () => {
      const lead = await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'step2-token-123',
          status: 'PENDING',
          step1CompletedAt: new Date()
        })
      })

      // Mock file upload
      const formData = new FormData()
      const file1 = new File(['content1'], 'doc1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'doc2.pdf', { type: 'application/pdf' })
      const file3 = new File(['content3'], 'doc3.pdf', { type: 'application/pdf' })
      
      formData.append('documents', file1)
      formData.append('documents', file2)
      formData.append('documents', file3)

      const request = new NextRequest('http://localhost:3000/api/intake/step2-token-123/step2', {
        method: 'POST',
        body: formData
      })

      const response = await Step2POST(request, { params: { token: 'step2-token-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify intake completion
      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { documents: true }
      })
      expect(updatedLead.step2CompletedAt).toBeTruthy()
      expect(updatedLead.intakeCompletedAt).toBeTruthy()
      expect(updatedLead.status).toBe('IN_PROGRESS')
      expect(updatedLead.documents).toHaveLength(3)
    })

    it('should require exactly 3 documents', async () => {
      await prisma.lead.create({
        data: testDataFactory.lead({
          intakeToken: 'docs-token',
          status: 'PENDING',
          step1CompletedAt: new Date()
        })
      })

      // Only 2 documents
      const formData = new FormData()
      const file1 = new File(['content1'], 'doc1.pdf', { type: 'application/pdf' })
      const file2 = new File(['content2'], 'doc2.pdf', { type: 'application/pdf' })
      
      formData.append('documents', file1)
      formData.append('documents', file2)

      const request = new NextRequest('http://localhost:3000/api/intake/docs-token/step2', {
        method: 'POST',
        body: formData
      })

      const response = await Step2POST(request, { params: { token: 'docs-token' } })

      expect(response.status).toBe(400)
    })
  })
})