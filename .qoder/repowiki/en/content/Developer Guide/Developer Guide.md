# Developer Guide

<cite>
**Referenced Files in This Document**   
- [README.md](file://README.md)
- [package.json](file://package.json)
- [prisma/seed.ts](file://prisma/seed.ts)
- [prisma/seeds/system-settings.ts](file://prisma/seeds/system-settings.ts)
- [src/lib/prisma.ts](file://src/lib/prisma.ts)
- [src/lib/auth.ts](file://src/lib/auth.ts)
- [src/services/LeadPoller.ts](file://src/services/LeadPoller.ts)
- [src/services/FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts)
- [scripts/health-check.sh](file://scripts/health-check.sh)
- [scripts/start-scheduler.sh](file://scripts/start-scheduler.sh)
- [src/app/api/cron/poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [src/app/api/cron/send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts)
</cite>

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Development Workflow](#development-workflow)
3. [Testing Strategy](#testing-strategy)
4. [Contribution Guidelines](#contribution-guidelines)
5. [Script Usage](#script-usage)
6. [Feature Development](#feature-development)
7. [Common Challenges](#common-challenges)

## Local Development Setup

This section provides comprehensive instructions for setting up a local development environment for the fund-track application.

### Prerequisites
Before beginning setup, ensure you have the following prerequisites installed:
- **Node.js 18+** (recommended: Node.js 22.x as specified in package.json)
- **PostgreSQL database** (for the primary application database)
- **MS SQL Server** (for legacy database integration)
- **npm 10.0.0 or higher**

### Step-by-Step Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fund-track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy the example environment file and modify it with your configuration:
   ```bash
   cp .env.example .env.local
   ```
   
   The following environment variables are required for local development:

   **Database Configuration**
   - `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/fund_track`)
   - `LEGACY_DB_CONNECTION_STRING`: MS SQL Server connection string for legacy data import

   **Authentication**
   - `NEXTAUTH_SECRET`: Secret key for NextAuth.js (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Base URL for the application (e.g., `http://localhost:3000`)

   **External Services**
   - `TWILIO_ACCOUNT_SID`: Twilio account SID for SMS notifications
   - `TWILIO_AUTH_TOKEN`: Twilio authentication token
   - `TWILIO_PHONE_NUMBER`: Twilio phone number for sending SMS
   - `MAILGUN_API_KEY`: Mailgun API key for email notifications
   - `MAILGUN_DOMAIN`: Mailgun domain for sending emails
   - `MAILGUN_FROM_EMAIL`: Email address for sending notifications
   - `B2_APPLICATION_KEY_ID`: Backblaze B2 application key ID
   - `B2_APPLICATION_KEY`: Backblaze B2 application key
   - `B2_BUCKET_NAME`: Backblaze B2 bucket name for document storage

   **Application Settings**
   - `NEXT_PUBLIC_BASE_URL`: Base URL of the application
   - `MERCHANT_FUNDING_CAMPAIGN_IDS`: Comma-separated list of campaign IDs to poll from legacy database
   - `LEAD_POLLING_BATCH_SIZE`: Number of leads to process in each batch (default: 100)

4. **Initialize the database**
   Run Prisma migrations to set up the database schema:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed the database with sample data**
   ```bash
   npm run db:seed
   ```
   
   This command creates sample users, leads, and system settings. The seed process includes:
   - Admin user: ardabasoglu@gmail.com / admin123
   - Regular user: user-001@merchantfunding.com / user123
   - Sales user: user-002@merchantfunding.com / user123

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

**Section sources**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [prisma/seed.ts](file://prisma/seed.ts)
- [prisma/seeds/system-settings.ts](file://prisma/seeds/system-settings.ts)

## Development Workflow

This section outlines the development workflow for the fund-track application, including coding standards, testing practices, and deployment processes.

### Code Structure and Organization
The application follows a structured organization pattern:

```mermaid
graph TD
A[src/] --> B[app/]
A --> C[components/]
A --> D[lib/]
A --> E[services/]
A --> F[types/]
B --> G[api/]
B --> H[dashboard/]
B --> I[admin/]
B --> J[auth/]
G --> K[cron/]
G --> L[dev/]
G --> M[leads/]
C --> N[dashboard/]
C --> O[admin/]
C --> P[auth/]
C --> Q[intake/]
D --> R[prisma.ts]
D --> S[auth.ts]
D --> T[logger.ts]
D --> U[monitoring.ts]
E --> V[LeadPoller.ts]
E --> W[FollowUpScheduler.ts]
E --> X[NotificationService.ts]
E --> Y[SystemSettingsService.ts]
```

**Diagram sources**
- [src/app](file://src/app)
- [src/components](file://src/components)
- [src/lib](file://src/lib)
- [src/services](file://src/services)

### Key Development Commands
The following npm scripts are available for development:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build application for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Create and run Prisma migration |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio for database exploration |

### Authentication Implementation
The application uses NextAuth.js for authentication with a credentials provider. The authentication flow is implemented in `src/lib/auth.ts`:

```mermaid
sequenceDiagram
participant User as "User"
participant Browser as "Browser"
participant AuthController as "AuthController"
participant Database as "Prisma Database"
User->>Browser : Enter email and password
Browser->>AuthController : POST /api/auth/callback/credentials
AuthController->>Database : Find user by email
Database-->>AuthController : Return user record
AuthController->>AuthController : Compare password hash
AuthController->>Browser : Set JWT session cookie
Browser->>User : Redirect to dashboard
```

**Diagram sources**
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L70)

**Section sources**
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L70)

## Testing Strategy

This section details the testing strategy for the fund-track application, including unit tests, integration tests, and diagnostic scripts.

### Available Test Files
The repository includes the following test files:

- `test/test-mailgun.ts`: Tests Mailgun email integration
- `test/test-legacy-db.js`: Tests legacy MS SQL Server database connectivity

### Running Tests
To run the available tests:

```bash
# Test Mailgun integration
npm run test:mailgun

# Run legacy database connectivity test
tsx test/test-legacy-db.js
```

### API Endpoint Testing
The application provides development endpoints for testing various components:

**Testing Legacy Database Connectivity**
```bash
# Access via browser
http://localhost:3000/dev/test-legacy-db

# Or via API
curl http://localhost:3000/api/dev/test-legacy-db
```

**Testing Notifications**
```bash
# Access via browser
http://localhost:3000/dev/test-notifications

# Or via API
curl http://localhost:3000/api/dev/test-notifications
```

### Diagnostic Scripts
The `scripts/` directory contains various diagnostic tools:

```mermaid
flowchart TD
A[Diagnostic Scripts] --> B[health-check.sh]
A --> C[db-diagnostic.sh]
A --> D[debug-migrations.sh]
A --> E[check-scheduler.mjs]
B --> F[Check application health]
C --> G[Database connectivity test]
D --> H[Prisma migration debugging]
E --> I[Scheduler status check]
```

**Diagram sources**
- [scripts/health-check.sh](file://scripts/health-check.sh)
- [scripts/db-diagnostic.sh](file://scripts/db-diagnostic.sh)
- [scripts/debug-migrations.sh](file://scripts/debug-migrations.sh)
- [scripts/check-scheduler.mjs](file://scripts/check-scheduler.mjs)

### Health Check Implementation
The health check script (`scripts/health-check.sh`) verifies application status by calling the health endpoint:

```mermaid
sequenceDiagram
participant Script as "health-check.sh"
participant API as "API Server"
participant Database as "PostgreSQL"
participant External as "External Services"
Script->>API : GET /api/health
API->>Database : Check connection
API->>External : Check Twilio, Mailgun, Backblaze
Database-->>API : Connection status
External-->>API : Service status
API-->>Script : JSON health response
Script->>Script : Parse and display results
```

**Diagram sources**
- [scripts/health-check.sh](file://scripts/health-check.sh#L1-L117)
- [src/app/api/health/route.ts](file://src/app/api/health/route.ts)

**Section sources**
- [scripts/health-check.sh](file://scripts/health-check.sh#L1-L117)
- [test/test-mailgun.ts](file://test/test-mailgun.ts)
- [test/test-legacy-db.js](file://test/test-legacy-db.js)

## Contribution Guidelines

This section outlines the contribution guidelines for the fund-track application, including code style, pull request processes, and best practices.

### Code Style and Conventions
The project follows these coding standards:

- **TypeScript**: All code is written in TypeScript with strict type checking
- **ESLint**: Code quality is enforced with ESLint using the Next.js configuration
- **Prettier**: Code formatting is standardized with Prettier
- **Naming Conventions**: 
  - Variables and functions use camelCase
  - Classes and interfaces use PascalCase
  - Constants use UPPER_CASE
- **File Organization**: 
  - Components are organized by feature
  - Services contain business logic
  - API routes are organized by functionality

### Pull Request Process
Follow these steps when creating a pull request:

1. **Create a feature branch** from the main branch
2. **Implement your changes** with comprehensive testing
3. **Run linting** to ensure code quality: `npm run lint`
4. **Test your changes** locally and verify all existing functionality works
5. **Create a pull request** with a clear description of the changes
6. **Reference the issue** being addressed in the PR description
7. **Wait for review** from team members
8. **Address feedback** and make necessary changes
9. **Merge after approval** from at least one reviewer

### Code Review Checklist
When reviewing code, consider the following:

- **Functionality**: Does the code achieve the intended purpose?
- **Readability**: Is the code easy to understand and maintain?
- **Performance**: Are there any potential performance issues?
- **Security**: Are there any security vulnerabilities?
- **Testing**: Are there adequate tests for the new functionality?
- **Documentation**: Is the code properly documented?
- **Style**: Does the code follow the project's style guidelines?

**Section sources**
- [package.json](file://package.json#L1-L70)
- [README.md](file://README.md#L1-L147)

## Script Usage

This section provides guidance on using the various scripts in the `scripts/` directory for testing, diagnostics, and operations.

### Scheduler Management Scripts
The application includes scripts for managing the background job scheduler:

**Starting the Scheduler**
```bash
# Run the startup script
./scripts/start-scheduler.sh
```

This script:
1. Checks if the server is running on localhost:3000
2. Checks the current scheduler status
3. Starts the scheduler if it's not already running
4. Tests manual lead polling

```mermaid
flowchart TD
A[Start Scheduler Script] --> B{Server Running?}
B --> |No| C[Exit with error]
B --> |Yes| D[Check Scheduler Status]
D --> E{Scheduler Running?}
E --> |Yes| F[Test Manual Polling]
E --> |No| G[Start Scheduler]
G --> H[Test Manual Polling]
```

**Diagram sources**
- [scripts/start-scheduler.sh](file://scripts/start-scheduler.sh#L1-L55)

### Database Scripts
Various scripts are available for database management:

**Backup and Recovery**
- `backup-database.sh`: Creates a database backup
- `disaster-recovery.sh`: Restores from a backup
- `db-diagnostic.sh`: Runs database diagnostics

**Migration Debugging**
- `debug-migrations.sh`: Helps debug Prisma migration issues
- `prisma-migrate-and-start.mjs`: Runs migrations and starts the application

### Cron Job Implementation
The application uses API routes as cron jobs for automated tasks:

**Lead Polling Cron Job**
```mermaid
sequenceDiagram
participant Cron as "Cron System"
participant API as "poll-leads API"
participant LeadPoller as "LeadPoller Service"
participant LegacyDB as "Legacy MS SQL DB"
participant Prisma as "Prisma Client"
Cron->>API : GET /api/cron/poll-leads
API->>LeadPoller : pollAndImportLeads()
LeadPoller->>LegacyDB : Query new leads
LegacyDB-->>LeadPoller : Return leads
LeadPoller->>Prisma : Create new leads
Prisma-->>LeadPoller : Confirm creation
LeadPoller-->>API : Return polling result
API-->>Cron : Success response
```

**Follow-up Processing Cron Job**
```mermaid
sequenceDiagram
participant Cron as "Cron System"
participant API as "send-followups API"
participant Scheduler as "FollowUpScheduler"
participant Notification as "NotificationService"
participant Twilio as "Twilio API"
participant Mailgun as "Mailgun API"
Cron->>API : GET /api/cron/send-followups
API->>Scheduler : processFollowUpQueue()
Scheduler->>Scheduler : Find due follow-ups
Scheduler->>Notification : sendEmail() or sendSMS()
Notification->>Mailgun : Send email
Notification->>Twilio : Send SMS
Mailgun-->>Notification : Confirmation
Twilio-->>Notification : Confirmation
Notification-->>Scheduler : Result
Scheduler-->>API : Processing result
API-->>Cron : Success response
```

**Diagram sources**
- [scripts/start-scheduler.sh](file://scripts/start-scheduler.sh#L1-L55)
- [src/app/api/cron/poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [src/app/api/cron/send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts)
- [src/services/LeadPoller.ts](file://src/services/LeadPoller.ts)
- [src/services/FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts)

**Section sources**
- [scripts/start-scheduler.sh](file://scripts/start-scheduler.sh#L1-L55)
- [scripts/backup-database.sh](file://scripts/backup-database.sh)
- [scripts/db-diagnostic.sh](file://scripts/db-diagnostic.sh)
- [scripts/debug-migrations.sh](file://scripts/debug-migrations.sh)
- [scripts/disaster-recovery.sh](file://scripts/disaster-recovery.sh)

## Feature Development

This section provides guidance on adding new features, modifying existing functionality, and maintaining code quality.

### Adding New Features
When adding new features, follow these steps:

1. **Plan the feature** with stakeholders and document requirements
2. **Create a database schema** if new data storage is needed
3. **Implement the backend logic** in services and API routes
4. **Create frontend components** for user interaction
5. **Write tests** for the new functionality
6. **Document the feature** in the README or documentation

### Modifying Existing Functionality
When modifying existing code:

1. **Understand the current implementation** by reading the code and tests
2. **Identify dependencies** and potential side effects
3. **Write tests** that verify current behavior (to prevent regressions)
4. **Make incremental changes** and test frequently
5. **Update documentation** to reflect changes
6. **Review with team members** before merging

### Data Flow Architecture
Understanding the data flow is crucial for feature development:

```mermaid
flowchart LR
A[Landing Page] --> B[Intake Form]
B --> C[Database Storage]
C --> D[Automated Follow-ups]
D --> E[Staff Dashboard]
E --> F[Lead Management]
F --> G[Document Upload]
G --> H[Backblaze B2]
H --> I[Application Processing]
I --> J[Status Updates]
J --> C
```

**Diagram sources**
- [src/app/api/intake/[token]/route.ts](file://src/app/api/intake/[token]/route.ts)
- [src/app/api/leads/[id]/route.ts](file://src/app/api/leads/[id]/route.ts)
- [src/services/FileUploadService.ts](file://src/services/FileUploadService.ts)

### Service Layer Architecture
The application uses a service layer pattern for business logic:

```mermaid
classDiagram
class LeadPoller {
+pollAndImportLeads() PollingResult
+fetchLeadsFromLegacy() LegacyLead[]
+processBatch() BatchResult
+importLead() void
-transformLegacyLead() LeadData
}
class FollowUpScheduler {
+scheduleFollowUpsForLead() FollowUpScheduleResult
+processFollowUpQueue() FollowUpProcessResult
+cancelFollowUpsForLead() boolean
}
class NotificationService {
+sendEmail() NotificationResult
+sendSMS() NotificationResult
+validateConfiguration() boolean
}
class SystemSettingsService {
+getSetting() SystemSetting
+updateSetting() SystemSetting
+getNotificationSettings() NotificationSettings
}
LeadPoller --> NotificationService : "uses"
FollowUpScheduler --> NotificationService : "uses"
FollowUpScheduler --> SystemSettingsService : "uses"
LeadPoller --> SystemSettingsService : "uses"
```

**Diagram sources**
- [src/services/LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)
- [src/services/FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L490)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts#L1-L471)
- [src/services/SystemSettingsService.ts](file://src/services/SystemSettingsService.ts)

**Section sources**
- [src/services/LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)
- [src/services/FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L490)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts#L1-L471)

## Common Challenges

This section addresses common development challenges and their solutions.

### Database Migration Issues
**Challenge**: Prisma migrations failing due to schema conflicts.

**Solutions**:
1. Use `npx prisma db push` for development schema updates
2. For production, create explicit migrations with `npx prisma migrate dev --name migration_name`
3. If migrations are out of sync, use `npx prisma migrate reset` (warning: deletes data)
4. Check migration lock file (`prisma/migration_lock.toml`) for conflicts

### Environment Configuration Problems
**Challenge**: Application failing to start due to missing environment variables.

**Solutions**:
1. Ensure `.env.local` file exists and contains all required variables
2. Verify the `DATABASE_URL` format is correct for PostgreSQL
3. Check that external service credentials (Twilio, Mailgun, Backblaze) are valid
4. Use `npm run build` with `SKIP_ENV_VALIDATION=true` to bypass environment validation during build

### Legacy Database Connectivity
**Challenge**: Issues connecting to the legacy MS SQL Server database.

**Solutions**:
1. Verify the `LEGACY_DB_CONNECTION_STRING` is correctly formatted
2. Ensure SQL Server authentication is enabled
3. Check firewall settings to allow connections on port 1433
4. Test connectivity using a database client before running the application
5. Use the test-legacy-db script to diagnose connection issues

### Notification Service Failures
**Challenge**: Email or SMS notifications not being sent.

**Solutions**:
1. Verify that notification services are enabled in system settings
2. Check that external service credentials are correct
3. Review rate limiting settings in the NotificationService
4. Examine notification logs in the database for error messages
5. Test notification services independently using the test scripts

### Scheduler Not Running
**Challenge**: Background jobs not executing automatically.

**Solutions**:
1. Ensure the scheduler is started with `./scripts/start-scheduler.sh`
2. Verify that cron jobs are configured to call the API endpoints
3. Check the application logs for scheduler errors
4. Test manual execution of cron endpoints:
   ```bash
   curl http://localhost:3000/api/cron/poll-leads
   curl http://localhost:3000/api/cron/send-followups
   ```
5. Ensure the `ENABLE_DEV_ENDPOINTS` environment variable is set to `true` in development

**Section sources**
- [src/lib/prisma.ts](file://src/lib/prisma.ts#L1-L60)
- [src/services/LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts#L1-L471)
- [scripts/start-scheduler.sh](file://scripts/start-scheduler.sh#L1-L55)
- [README.md](file://README.md#L1-L147)