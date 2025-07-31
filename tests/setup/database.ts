import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

export async function setupTestDatabase() {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  })

  // Clean up database before tests
  await cleanupDatabase()
  
  return prisma
}

export async function cleanupDatabase() {
  if (!prisma) return

  // Delete in order to respect foreign key constraints
  await prisma.notificationLog.deleteMany()
  await prisma.followupQueue.deleteMany()
  await prisma.document.deleteMany()
  await prisma.leadNote.deleteMany()
  await prisma.leadStatusHistory.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.user.deleteMany()
}

export async function teardownTestDatabase() {
  if (prisma) {
    await cleanupDatabase()
    await prisma.$disconnect()
  }
}

export function getTestPrisma() {
  return prisma
}

// Test data factories
export const testDataFactory = {
  user: (overrides = {}) => ({
    email: 'test@example.com',
    passwordHash: '$2b$12$test.hash',
    role: 'USER' as const,
    ...overrides,
  }),

  lead: (overrides = {}) => ({
    legacyLeadId: BigInt(Math.floor(Math.random() * 1000000)),
    campaignId: 1,
    email: 'lead@example.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    businessName: 'Test Business',
    status: 'NEW' as const,
    intakeToken: 'test-token-' + Math.random().toString(36).substr(2, 9),
    ...overrides,
  }),

  leadNote: (leadId: number, userId: number, overrides = {}) => ({
    leadId,
    userId,
    content: 'Test note content',
    ...overrides,
  }),

  document: (leadId: number, overrides = {}) => ({
    leadId,
    filename: 'test-document.pdf',
    originalFilename: 'test-document.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    b2FileId: 'test-file-id',
    b2BucketName: 'test-bucket',
    ...overrides,
  }),
}