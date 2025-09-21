# Environment Configuration

<cite>
**Referenced Files in This Document**   
- [next.config.mjs](file://next.config.mjs)
- [NotificationService.ts](file://src/services/NotificationService.ts)
- [server-init.ts](file://src/lib/server-init.ts)
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts)
- [prisma.ts](file://src/lib/prisma.ts)
- [README.md](file://README.md)
- [system-settings.ts](file://prisma/seeds/system-settings.ts)
</cite>

## Table of Contents
1. [Environment Variables Overview](#environment-variables-overview)
2. [Database Configuration](#database-configuration)
3. [Authentication Settings](#authentication-settings)
4. [External Service Credentials](#external-service-credentials)
5. [Application Settings](#application-settings)
6. [Scheduler Configuration](#scheduler-configuration)
7. [Environment Loading and Validation](#environment-loading-and-validation)
8. [Environment Configuration Examples](#environment-configuration-examples)
9. [Security Best Practices](#security-best-practices)

## Environment Variables Overview

The fund-track application relies on environment variables for configuration across different deployment environments. These variables control database connections, authentication, external service integrations, and application behavior. The application uses Next.js runtime configuration to load and validate these variables.

The environment variables are categorized into several groups:
- Database connection strings
- Authentication secrets
- External service credentials (email, SMS, file storage)
- Application settings and URLs
- Scheduler and background job configurations

All sensitive configuration data should be stored in environment variables rather than in code, and different values should be used for development, staging, and production environments.

**Section sources**
- [next.config.mjs](file://next.config.mjs)
- [README.md](file://README.md)

## Database Configuration

### POSTGRES_URL and DATABASE_URL
These environment variables specify the connection string for the PostgreSQL database.

**Purpose**: 
- `DATABASE_URL`: Primary connection string used by Prisma ORM to connect to the PostgreSQL database
- `POSTGRES_URL`: Alternative name for the database connection string, maintained for compatibility

**Security Implications**: 
The connection string contains sensitive information including the database username, password, host, and database name. If compromised, an attacker could gain full access to the database.

**Default Values**: 
No default values are provided. These variables must be explicitly set.

**Validation**: 
The application validates the database connection during startup using the `checkPrismaConnection` function in `prisma.ts`. During build time or when the `SKIP_ENV_VALIDATION` environment variable is set to 'true', the database connection is not established.

```typescript
// src/lib/prisma.ts
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.DATABASE_URL?.includes('placeholder') ||
  !process.env.DATABASE_URL ||
  typeof window !== 'undefined';
```

**Section sources**
- [prisma.ts](file://src/lib/prisma.ts)

## Authentication Settings

### NEXTAUTH_SECRET
**Purpose**: This secret key is used by NextAuth.js to encrypt JWT tokens and protect against tampering. It's critical for the security of the authentication system.

**Security Implications**: 
This is a highly sensitive secret. If compromised, an attacker could forge authentication tokens and impersonate any user in the system. It must be a cryptographically secure random string of at least 32 characters.

**Default Values**: 
None. This variable must be set in all environments.

### NEXTAUTH_URL
**Purpose**: Specifies the base URL where the application is deployed, which NextAuth.js uses to construct callback URLs for authentication flows.

**Security Implications**: 
While not directly sensitive, incorrect configuration can lead to authentication failures or potential security issues with redirect URLs.

**Default Values**: 
- Development: `http://localhost:3000`
- Production: `https://fund-track.merchantfunding.com`

**Section sources**
- [next.config.mjs](file://next.config.mjs)

## External Service Credentials

### Mailgun Configuration
The application uses Mailgun for sending email notifications.

**Required Variables**:
- `MAILGUN_API_KEY`: API key for authenticating with the Mailgun service
- `MAILGUN_DOMAIN`: Domain configured in Mailgun for sending emails
- `MAILGUN_FROM_EMAIL`: Email address used as the sender for all outgoing emails

**Purpose**: 
These credentials enable the NotificationService to send email notifications to leads and administrators.

**Security Implications**: 
The API key is sensitive and should be treated as a secret. If compromised, an attacker could send emails through your Mailgun account, potentially incurring costs or sending spam.

**Validation**: 
The NotificationService validates these configuration variables on startup:

```typescript
// src/services/NotificationService.ts
async validateConfiguration(): Promise<boolean> {
  const requiredEmailVars = [
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'MAILGUN_FROM_EMAIL',
  ];
  
  const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);
  
  if (missingEmailVars.length > 0) {
    console.error('Missing required email environment variables:', missingEmailVars);
    return false;
  }
  
  return true;
}
```

### Twilio Configuration
The application uses Twilio for sending SMS notifications.

**Required Variables**:
- `TWILIO_ACCOUNT_SID`: Account identifier for the Twilio service
- `TWILIO_AUTH_TOKEN`: Authentication token for the Twilio account
- `TWILIO_PHONE_NUMBER`: Phone number registered with Twilio for sending SMS messages

**Purpose**: 
These credentials enable the NotificationService to send SMS notifications to leads.

**Security Implications**: 
The auth token is highly sensitive. If compromised, an attacker could send SMS messages through your Twilio account, incurring costs.

**Validation**: 
The NotificationService checks for these variables when SMS functionality is enabled:

```typescript
// src/services/NotificationService.ts
const settings = await getNotificationSettings();
const missingSmsVars = settings.smsEnabled ? requiredSmsVars.filter(varName => !process.env[varName]) : [];
```

### Backblaze B2 Configuration
The application uses Backblaze B2 for file storage.

**Required Variables**:
- `B2_APPLICATION_KEY_ID`: Identifier for the Backblaze application key
- `B2_APPLICATION_KEY`: Secret key for authenticating with Backblaze B2
- `B2_BUCKET_NAME`: Name of the storage bucket
- `B2_BUCKET_ID`: Identifier of the storage bucket

**Purpose**: 
These credentials enable the FileUploadService to store and retrieve files from Backblaze B2.

**Security Implications**: 
The application key is sensitive. If compromised, an attacker could read, write, or delete files in your storage bucket.

**Implementation**: 
The FileUploadService uses these variables to initialize the B2 client:

```typescript
// src/services/FileUploadService.ts
constructor() {
  this.b2 = new B2({
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
    applicationKey: process.env.B2_APPLICATION_KEY!,
  });
  this.bucketName = process.env.B2_BUCKET_NAME!;
  this.bucketId = process.env.B2_BUCKET_ID!;
}
```

**Section sources**
- [NotificationService.ts](file://src/services/NotificationService.ts)
- [FileUploadService.ts](file://src/services/FileUploadService.ts)

## Application Settings

### APP_BASE_URL and NEXT_PUBLIC_BASE_URL
**Purpose**: 
- `APP_BASE_URL`: Internal base URL used by server-side components for constructing absolute URLs
- `NEXT_PUBLIC_BASE_URL`: Public base URL exposed to client-side code for API calls and link generation

**Security Implications**: 
These are not sensitive but must be correctly configured for the application to function properly.

**Default Values**: 
- Development: `http://localhost:3000`
- Production: `https://fund-track.merchantfunding.com`

### ADMIN_EMAIL
**Purpose**: Email address used for sending system alerts and error notifications.

**Security Implications**: 
Not sensitive, but should be a monitored email address.

**Default Values**: `ardabasoglu@gmail.com`

### TZ
**Purpose**: Timezone configuration for the application, used by cron jobs and date/time operations.

**Security Implications**: Not sensitive.

**Default Values**: `America/New_York`

**Section sources**
- [server-init.ts](file://src/lib/server-init.ts)
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts)

## Scheduler Configuration

### SCHEDULER_ENABLED and ENABLE_BACKGROUND_JOBS
**Purpose**: 
These variables control whether background job schedulers are automatically started when the application starts.

**Security Implications**: 
Not directly sensitive, but controls important application functionality.

**Default Values**: 
- `ENABLE_BACKGROUND_JOBS`: `false` (disabled by default in development)
- The scheduler runs automatically in production (`NODE_ENV=production`)

**Implementation**: 
The server initialization logic checks these variables:

```typescript
// src/lib/server-init.ts
const shouldStartScheduler =
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_BACKGROUND_JOBS === "true";
```

### Cron Pattern Variables
**Purpose**: 
These variables allow customization of the schedule for background jobs:

- `LEAD_POLLING_CRON_PATTERN`: Controls how frequently the system checks for new leads from the legacy database
- `FOLLOWUP_CRON_PATTERN`: Controls how frequently the system processes follow-up actions
- `CLEANUP_CRON_PATTERN`: Controls how frequently the system cleans up old data

**Default Values**: 
- `LEAD_POLLING_CRON_PATTERN`: `*/15 * * * *` (every 15 minutes)
- `FOLLOWUP_CRON_PATTERN`: `*/5 * * * *` (every 5 minutes)
- `CLEANUP_CRON_PATTERN`: `0 2 * * *` (daily at 2:00 AM)

**Implementation**: 
The BackgroundJobScheduler uses these patterns:

```typescript
// src/services/BackgroundJobScheduler.ts
const leadPollingPattern =
  process.env.LEAD_POLLING_CRON_PATTERN || "*/15 * * * *";

this.leadPollingTask = cron.schedule(
  leadPollingPattern,
  async () => {
    await this.executeLeadPollingJob();
  },
  {
    scheduled: false,
    timezone: process.env.TZ || "America/New_York",
  } as any
);
```

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts)
- [server-init.ts](file://src/lib/server-init.ts)

## Environment Loading and Validation

The fund-track application uses Next.js runtime configuration to load and validate environment variables. The configuration is defined in `next.config.mjs`.

### Environment Variable Loading
Next.js automatically loads environment variables from `.env.local` files. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser, while others are only available on the server.

```javascript
// next.config.mjs
const nextConfig = {
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};
```

### Validation Process
The application performs environment validation at multiple levels:

1. **Server Initialization**: The `initializeServer` function validates critical services:
```typescript
// src/lib/server-init.ts
// Validate notification service configuration
const notificationConfigValid = notificationService.validateConfiguration();
```

2. **Service-Level Validation**: Individual services validate their required variables:
```typescript
// src/services/NotificationService.ts
async validateConfiguration(): Promise<boolean> {
  const requiredEmailVars = [
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'MAILGUN_FROM_EMAIL',
  ];
  // ... validation logic
}
```

3. **Runtime Checks**: The application checks for required variables when specific functionality is used.

### Security Headers
The application configures security headers based on environment variables:

```javascript
// next.config.mjs
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        // ... other security headers
      ],
    },
  ];
}
```

**Section sources**
- [next.config.mjs](file://next.config.mjs)
- [server-init.ts](file://src/lib/server-init.ts)
- [NotificationService.ts](file://src/services/NotificationService.ts)

## Environment Configuration Examples

### Development Environment (.env.local)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fund_track_dev

# Authentication
NEXTAUTH_SECRET=your-development-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Application
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
TZ=America/New_York

# External Services (use sandbox/test credentials)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=sandbox12345.mailgun.org
MAILGUN_FROM_EMAIL=no-reply@localhost

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+15005550006

B2_APPLICATION_KEY_ID=your-backblaze-key-id
B2_APPLICATION_KEY=your-backblaze-application-key
B2_BUCKET_NAME=fund-track-dev
B2_BUCKET_ID=your-bucket-id

# Features
ENABLE_BACKGROUND_JOBS=false
```

### Staging Environment (.env.staging)
```env
# Database
DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/fund_track_staging

# Authentication
NEXTAUTH_SECRET=a-very-secure-random-string-generated-for-staging
NEXTAUTH_URL=https://staging.fund-track.merchantfunding.com

# Application
APP_BASE_URL=https://staging.fund-track.merchantfunding.com
NEXT_PUBLIC_BASE_URL=https://staging.fund-track.merchantfunding.com
TZ=America/New_York

# External Services (use real credentials but with limits)
MAILGUN_API_KEY=staging-mailgun-api-key
MAILGUN_DOMAIN=staging.merchantfunding.com
MAILGUN_FROM_EMAIL=no-reply@staging.merchantfunding.com

TWILIO_ACCOUNT_SID=staging-twilio-account-sid
TWILIO_AUTH_TOKEN=staging-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

B2_APPLICATION_KEY_ID=staging-backblaze-key-id
B2_APPLICATION_KEY=staging-backblaze-application-key
B2_BUCKET_NAME=fund-track-staging
B2_BUCKET_ID=staging-bucket-id

# Features
ENABLE_BACKGROUND_JOBS=true
SCHEDULER_ENABLED=true
```

### Production Environment (.env.production)
```env
# Database
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/fund_track_prod

# Authentication
NEXTAUTH_SECRET=a-very-secure-random-string-generated-for-production
NEXTAUTH_URL=https://fund-track.merchantfunding.com

# Application
APP_BASE_URL=https://fund-track.merchantfunding.com
NEXT_PUBLIC_BASE_URL=https://fund-track.merchantfunding.com
TZ=America/New_York

# External Services
MAILGUN_API_KEY=production-mailgun-api-key
MAILGUN_DOMAIN=merchantfunding.com
MAILGUN_FROM_EMAIL=no-reply@merchantfunding.com

TWILIO_ACCOUNT_SID=production-twilio-account-sid
TWILIO_AUTH_TOKEN=production-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

B2_APPLICATION_KEY_ID=production-backblaze-key-id
B2_APPLICATION_KEY=production-backblaze-application-key
B2_BUCKET_NAME=fund-track-prod
B2_BUCKET_ID=production-bucket-id

# Features
ENABLE_BACKGROUND_JOBS=true
SCHEDULER_ENABLED=true

# Optional: Custom cron patterns
# LEAD_POLLING_CRON_PATTERN=*/15 * * * *
# FOLLOWUP_CRON_PATTERN=*/5 * * * *
# CLEANUP_CRON_PATTERN=0 2 * * *
```

**Section sources**
- [README.md](file://README.md)
- [system-settings.ts](file://prisma/seeds/system-settings.ts)

## Security Best Practices

### Securing Sensitive Configuration Data
1. **Never commit environment files**: Add `.env*` files to `.gitignore` to prevent accidental commits of sensitive data.
2. **Use different secrets for each environment**: Never reuse production secrets in development or staging.
3. **Generate strong secrets**: Use cryptographically secure random generators for secrets like `NEXTAUTH_SECRET`.
4. **Rotate credentials regularly**: Periodically rotate API keys and passwords.
5. **Use environment-specific values**: Configure different database names, buckets, and domains for each environment.

### Managing Environment-Specific Settings
1. **Use a consistent naming convention**: Follow the pattern of having different environment files (`.env.local`, `.env.staging`, `.env.production`).
2. **Document all required variables**: Maintain an `.env.example` file that lists all required variables with example values (but no real secrets).
3. **Validate configuration on startup**: Implement validation functions like `validateConfiguration()` to catch missing variables early.
4. **Use feature flags**: Control functionality with variables like `ENABLE_BACKGROUND_JOBS` rather than hardcoding behavior.
5. **Implement graceful degradation**: When optional services are not configured, log warnings but allow the application to continue running.

### Deployment Pipeline Management
1. **Use secret management tools**: In production, use secret management services (AWS Secrets Manager, Hashicorp Vault, etc.) rather than plain environment variables.
2. **Automate environment setup**: Use deployment scripts to set environment variables consistently across servers.
3. **Restrict access**: Limit who can view or modify production environment variables.
4. **Audit changes**: Keep logs of when environment variables are changed.
5. **Backup configuration**: Regularly backup environment configurations as part of disaster recovery planning.

The fund-track application follows these best practices by validating critical service configurations on startup and providing clear error messages when required variables are missing.

**Section sources**
- [NotificationService.ts](file://src/services/NotificationService.ts)
- [server-init.ts](file://src/lib/server-init.ts)
- [README.md](file://README.md)