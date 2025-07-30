const { setupTestDatabase, teardownTestDatabase } = require('./database.ts')

// Setup test database before all tests
beforeAll(async () => {
  await setupTestDatabase()
})

// Cleanup after all tests
afterAll(async () => {
  await teardownTestDatabase()
})

// Mock environment variables for integration tests
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'integration-test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'