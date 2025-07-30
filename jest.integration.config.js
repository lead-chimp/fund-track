const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'Integration Tests',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/types/**/*',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  maxWorkers: 1, // Run integration tests sequentially
}

module.exports = createJestConfig(customJestConfig)