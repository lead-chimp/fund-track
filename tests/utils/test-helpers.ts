import { NextRequest } from 'next/server'

export function createMockRequest(url: string, options: Omit<RequestInit, 'signal'> & { signal?: AbortSignal } = {}) {
  return new NextRequest(url, {
    method: 'GET',
    ...options,
  })
}

export function createMockFormData(data: Record<string, string | File>) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

export function createMockFile(name: string, content: string, type: string = 'text/plain') {
  return new File([content], name, { type })
}

export async function extractJsonFromResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function mockConsole() {
  const originalConsole = { ...console }
  
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  return originalConsole
}

export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createMockSession(overrides = {}) {
  return {
    user: {
      id: 1,
      email: 'test@example.com',
      role: 'ADMIN',
      ...overrides
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}