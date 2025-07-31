# Test Suite Documentation

This document describes the comprehensive test suite for the Fund Track App.

## Test Structure

### Unit Tests
Located in `src/**/__tests__/*.test.ts` files alongside the source code.

**Coverage:**
- Services (NotificationService, FileUploadService, LeadPoller, etc.)
- API route handlers
- React components
- Utility functions
- Error handling

**Configuration:** `jest.config.js`

### Integration Tests
Located in `src/**/__tests__/*.integration.test.ts` files.

**Coverage:**
- API endpoints with real database
- Service integrations
- External service mocking
- Database operations

**Configuration:** `jest.integration.config.js`

### End-to-End Tests
Located in `tests/e2e/*.spec.ts` files.

**Coverage:**
- Complete user workflows
- Intake process
- Staff dashboard
- Authentication flows
- Cross-browser testing

**Configuration:** `playwright.config.ts`

## Test Categories

### 1. Service Layer Tests
- **NotificationService**: Email/SMS sending, retry logic, logging
- **FileUploadService**: B2 integration, validation, metadata management
- **LeadPoller**: Legacy database integration, data transformation
- **TokenService**: Secure token generation and validation
- **FollowUpScheduler**: Automated follow-up management

### 2. API Route Tests
- **Authentication**: Login, session management, role-based access
- **Lead Management**: CRUD operations, search, filtering
- **Intake Workflow**: Multi-step form processing, document upload
- **Cron Jobs**: Background processing, lead polling, follow-ups

### 3. Component Tests
- **Dashboard Components**: Lead list, search, filters, pagination
- **Intake Components**: Multi-step forms, validation, progress tracking
- **Authentication Components**: Login forms, role guards

### 4. Integration Tests
- **Database Operations**: Prisma integration, transactions, constraints
- **External Services**: Mocked Twilio, MailGun, Backblaze B2
- **API Workflows**: Complete request/response cycles

### 5. End-to-End Tests
- **Intake Workflow**: Complete application process
- **Staff Dashboard**: Lead management workflows
- **Authentication**: Login/logout flows
- **Error Handling**: Network failures, validation errors

## Mock Services

### External API Mocks
Located in `src/__mocks__/external-services.ts`:

- **TwilioMockService**: SMS sending simulation
- **MailgunMockService**: Email sending simulation  
- **BackblazeMockService**: File storage simulation
- **MSSQLMockService**: Legacy database simulation

### Features:
- Configurable success/failure modes
- Request tracking and verification
- Realistic response simulation
- Error condition testing

## Test Data Factories

Located in `tests/setup/database.ts`:

- **testDataFactory.user()**: Creates test user records
- **testDataFactory.lead()**: Creates test lead records
- **testDataFactory.document()**: Creates test document records
- **testDataFactory.leadNote()**: Creates test note records

## Coverage Requirements

### Minimum Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: `coverage/lcov.info`
- **JSON Summary**: `coverage/coverage-summary.json`

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Integration Tests Only
```bash
npm run test:integration
```

### End-to-End Tests Only
```bash
npm run test:e2e
npm run test:e2e:ui   # With UI
```

### CI Pipeline
```bash
npm run test:ci       # Unit + Integration
```

## Test Environment Setup

### Database
- Uses PostgreSQL test database
- Automatic setup/teardown via `tests/setup/database.ts`
- Clean state for each test

### Environment Variables
All required environment variables are mocked in test setup:
- Database connections
- External service credentials
- Authentication secrets

### File Fixtures
Test files located in `tests/fixtures/`:
- PDF documents for upload testing
- Image files for validation testing

## Continuous Integration

### GitHub Actions Workflow
Located in `.github/workflows/ci.yml`:

1. **Lint & Type Check**
2. **Unit Tests** with coverage reporting
3. **Integration Tests** with test database
4. **End-to-End Tests** with Playwright
5. **Security Scanning** with npm audit
6. **Build Verification**

### Coverage Reporting
- Codecov integration for coverage tracking
- Coverage reports uploaded on CI runs
- Pull request coverage comparisons

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mocking Strategy
- Mock external dependencies at module level
- Use dependency injection for testability
- Verify mock interactions where relevant

### Data Management
- Use factories for consistent test data
- Clean database state between tests
- Avoid test interdependencies

### Error Testing
- Test both success and failure paths
- Verify error messages and status codes
- Test edge cases and boundary conditions

## Debugging Tests

### Common Issues
1. **Database Connection**: Ensure test database is running
2. **Mock Configuration**: Verify mocks are properly set up
3. **Async Operations**: Use proper async/await patterns
4. **Environment Variables**: Check test environment setup

### Debug Commands
```bash
# Run specific test file
npm test -- --testPathPatterns="filename"

# Run with verbose output
npm test -- --verbose

# Run in debug mode
npm test -- --runInBand --detectOpenHandles
```

## Performance Considerations

### Test Execution Speed
- Integration tests run sequentially (`maxWorkers: 1`)
- Unit tests run in parallel (`maxWorkers: '50%'`)
- Database cleanup optimized for speed

### Resource Management
- Proper cleanup of database connections
- Mock service state reset between tests
- Memory leak prevention in long test runs

## Future Improvements

### Planned Enhancements
1. Visual regression testing with Percy
2. Performance testing with Lighthouse CI
3. Contract testing with Pact
4. Mutation testing with Stryker
5. Load testing with Artillery

### Monitoring
- Test execution time tracking
- Flaky test identification
- Coverage trend analysis
- CI pipeline optimization