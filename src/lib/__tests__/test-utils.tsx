import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

// Mock session for testing
const mockSession: Session = {
  user: {
    id: '1',
    email: 'test@example.com',
    role: 'ADMIN',
  },
  expires: '2024-12-31',
}

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockLead = (overrides = {}) => ({
  id: 1,
  legacyLeadId: BigInt(123456),
  campaignId: 1,
  email: 'test@example.com',
  phone: '+1234567890',
  firstName: 'John',
  lastName: 'Doe',
  businessName: 'Test Business',
  status: 'NEW' as const,
  intakeToken: 'test-token-123',
  intakeCompletedAt: null,
  step1CompletedAt: null,
  step2CompletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  importedAt: new Date().toISOString(),
  notes: [],
  documents: [],
  _count: {
    notes: 0,
    documents: 0,
    followupQueue: 0,
  },
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  passwordHash: '$2b$12$test.hash',
  role: 'ADMIN' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

export const createMockDocument = (overrides = {}) => ({
  id: 1,
  leadId: 1,
  filename: 'test-document.pdf',
  originalFilename: 'Test Document.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  b2FileId: 'test-file-id',
  b2BucketName: 'test-bucket',
  uploadedBy: 1,
  uploadedAt: new Date().toISOString(),
  user: {
    id: 1,
    email: 'staff@example.com',
  },
  ...overrides,
})

export const createMockNote = (overrides = {}) => ({
  id: 1,
  leadId: 1,
  userId: 1,
  content: 'Test note content',
  createdAt: new Date().toISOString(),
  user: {
    id: 1,
    email: 'staff@example.com',
  },
  ...overrides,
})

// API response helpers
export const createApiResponse = (data: any, status = 200) => ({
  json: () => Promise.resolve(data),
  status,
  ok: status >= 200 && status < 300,
})

// Mock fetch for API testing
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(response),
      status,
      ok: status >= 200 && status < 300,
    })
  ) as jest.Mock
}

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as jest.Mock).mockClear()
  }
}