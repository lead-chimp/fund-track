# Environment Setup

<cite>
**Referenced Files in This Document**   
- [package.json](file://package.json)
- [tsconfig.json](file://tsconfig.json)
- [README.md](file://README.md)
- [DATABASE_SETUP.md](file://docs/DATABASE_SETUP.md)
- [prisma/seed.ts](file://prisma/seed.ts)
- [prisma/seed-production.ts](file://prisma/seed-production.ts)
- [src/lib/prisma.ts](file://src/lib/prisma.ts)
- [scripts/debug-migrations.sh](file://scripts/debug-migrations.sh)
- [scripts/prisma-migrate-and-start.mjs](file://scripts/prisma-migrate-and-start.mjs)
</cite>

## Table of Contents
1. [Install Node.js and Dependencies](#install-nodejs-and-dependencies)
2. [Configure PostgreSQL Database](#configure-postgresql-database)
3. [Set Up Environment Variables](#set-up-environment-variables)
4. [Run Prisma Migrations](#run-prisma-migrations)
5. [Seed the Database](#seed-the-database)
6. [Common Setup Issues and Troubleshooting](#common-setup-issues-and-troubleshooting)
7. [Verification Steps](#verification-steps)

## Install Node.js and Dependencies

To set up the local development environment for the fund-track application, begin by installing the required software and dependencies.

### Install Node.js

The application requires **Node.js 22.x** as specified in the `engines` field of `package.json`. Install Node.js using one of the following methods:

- **Using Node Version Manager (nvm)**:
  ```bash
  nvm install 22
  nvm use 22
  ```

- **Direct Download**: Visit [nodejs.org](https://nodejs.org) and download the latest 22.x version.

Verify installation:
```bash
node --version  # Should output v22.x.x
npm --version   # Should be >=10.0.0
```

### Install Project Dependencies

After cloning the repository, navigate to the project root and install dependencies:

```bash
cd 
npm install
```

This installs all dependencies listed in `package.json`, including:
- **Prisma ORM** for database management
- **Next.js** for the frontend framework
- **TypeScript** for type checking
- External services: **Twilio**, **MailGun**, **Backblaze B2**

**Section sources**
- [package.json](file://package.json#L1-L70)

## Configure PostgreSQL Database

The application uses PostgreSQL as its primary database. Follow these steps to configure it.

### Install PostgreSQL

Ensure PostgreSQL is installed and running:
- **macOS**: Use Homebrew: `brew install postgresql`
- **Linux**: Use your distribution's package manager
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

Start the PostgreSQL service:
```bash
brew services start postgresql  # macOS
```

### Create Database

Connect to PostgreSQL and create the database:
```bash
psql postgres
CREATE DATABASE fund_track_app;
\q
```

**Section sources**
- [DATABASE_SETUP.md](file://docs/DATABASE_SETUP.md#L1-L163)

## Set Up Environment Variables

Environment variables are essential for configuring database connections, authentication, and third-party integrations.

### Create Environment File

Copy the example environment file:
```bash
cp .env.example .env.local
```

If `.env.example` does not exist, create it based on the required variables.

### Configure Required Variables

Edit `.env.local` with the following configurations:

#### Database Configuration
```
DATABASE_URL="postgresql://username:password@localhost:5432/fund_track_app"
```

Replace `username` and `password` with your PostgreSQL credentials.

#### Authentication Secrets
```
NEXTAUTH_SECRET="your_random_32_character_string"
```
Generate a secure secret:
```bash
openssl rand -base64 32
```

#### Twilio Integration
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### MailGun Integration
```
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.mailgun.org
MAILGUN_FROM_EMAIL=no-reply@your_domain.mailgun.org
```

#### Backblaze B2 Integration
```
B2_APPLICATION_KEY_ID=your_application_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name
```

#### Production Seeding (Optional)
```
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_password
```

**Section sources**
- [README.md](file://README.md#L0-L147)
- [src/lib/prisma.ts](file://src/lib/prisma.ts#L1-L60)
- [src/app/api/health/route.ts](file://src/app/api/health/route.ts#L103-L147)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts#L53-L101)

## Run Prisma Migrations

Prisma manages the database schema through migration files located in `prisma/migrations/`.

### Generate Prisma Client

After setting up the database URL, generate the Prisma client:
```bash
npm run db:generate
```

This command generates the Prisma Client based on the schema in `prisma/schema.prisma`.

### Apply Migrations

Run the migrations to set up the database schema:
```bash
npm run db:migrate
```

This executes all migration files in sequence, creating tables such as:
- `User`
- `Lead`
- `LeadNote`
- `Document`
- `FollowupQueue`
- `NotificationLog`
- `SystemSetting`

For production deployment, use:
```bash
npm run db:migrate:prod
```

```mermaid
flowchart TD
A["Start Migration Process"] --> B["Validate DATABASE_URL"]
B --> C["Generate Prisma Client"]
C --> D["Run Migration Files"]
D --> E["Apply SQL Scripts"]
E --> F["Update Database Schema"]
F --> G["Complete Migration"]
```

**Diagram sources**
- [package.json](file://package.json#L1-L70)
- [DATABASE_SETUP.md](file://docs/DATABASE_SETUP.md#L1-L163)

**Section sources**
- [package.json](file://package.json#L1-L70)
- [DATABASE_SETUP.md](file://docs/DATABASE_SETUP.md#L1-L163)

## Seed the Database

After migrations, populate the database with initial data using seed scripts.

### Development Seeding

For development, use the full seed script:
```bash
npm run db:seed
```

This script:
- Deletes existing data (if `FORCE_SEED=true`)
- Creates 3 users (admin and two regular users)
- Creates 6 sample leads with various statuses
- Adds sample notes, documents, follow-ups, and notifications

To force seeding (deletes all data):
```bash
FORCE_SEED=true npm run db:seed
```

### Simple Seeding

For minimal setup:
```bash
npm run db:seed:simple
```

### Production Seeding

In production, create only the admin user:
```bash
ADMIN_PASSWORD=your_secure_password FORCE_SEED=true npm run db:seed:prod
```

The script checks if an admin already exists and creates one if not.

```mermaid
sequenceDiagram
participant CLI as Command Line
participant Seed as seed.ts
participant DB as Database
CLI->>Seed : npm run db : seed
Seed->>DB : Check existing data
alt Data exists
Seed->>CLI : Exit with warning
else Force seed
Seed->>DB : Delete all data
DB-->>Seed : Confirmation
Seed->>DB : Create users
Seed->>DB : Create leads
Seed->>DB : Create related data
end
Seed->>CLI : Success message
```

**Diagram sources**
- [prisma/seed.ts](file://prisma/seed.ts#L1-L511)
- [prisma/seed-production.ts](file://prisma/seed-production.ts#L1-L71)

**Section sources**
- [prisma/seed.ts](file://prisma/seed.ts#L1-L511)
- [prisma/seed-production.ts](file://prisma/seed-production.ts#L1-L71)

## Common Setup Issues and Troubleshooting

### Migration Conflicts

**Issue**: Migration lock file conflict
```
Error: Migration engine error: A migration has failed to apply.
```

**Solution**:
1. Delete `prisma/migration_lock.toml`
2. Reset migrations: `npx prisma migrate reset`
3. Re-run migrations

### Permission Errors

**Issue**: Database connection permission denied
```
error: Database "fund_track_app" is not accessible
```

**Solution**:
1. Verify PostgreSQL user has correct privileges:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE fund_track_app TO your_username;
   ```
2. Check `.env.local` credentials

### Connection Timeouts

**Issue**: Database connection timeout
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
1. Ensure PostgreSQL is running:
   ```bash
   brew services list | grep postgresql
   ```
2. Verify `DATABASE_URL` port matches PostgreSQL configuration
3. Check firewall settings

### Prisma Client Generation Issues

**Issue**: Module not found: `@prisma/client`

**Solution**:
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Regenerate client:
   ```bash
   npm run db:generate
   ```

### Seed Script Failures

**Issue**: Unique constraint violation during seeding

**Solution**:
1. Use `FORCE_SEED=true` to clear existing data
2. Ensure migrations are applied before seeding

```mermaid
flowchart TD
A["Setup Issue"] --> B{"Error Type?"}
B --> |Migration| C["Check migration files<br/>Verify DATABASE_URL<br/>Reset if needed"]
B --> |Permission| D["Verify user privileges<br/>Check credentials<br/>Test connection"]
B --> |Connection| E["Ensure PostgreSQL running<br/>Check port and host<br/>Verify network"]
B --> |Dependency| F["Clean install<br/>Regenerate Prisma client<br/>Check Node version"]
C --> G["Resolved"]
D --> G
E --> G
F --> G
```

**Diagram sources**
- [scripts/debug-migrations.sh](file://scripts/debug-migrations.sh#L1-L95)
- [src/lib/prisma.ts](file://src/lib/prisma.ts#L1-L60)

**Section sources**
- [scripts/debug-migrations.sh](file://scripts/debug-migrations.sh#L1-L95)
- [src/lib/prisma.ts](file://src/lib/prisma.ts#L1-L60)

## Verification Steps

After completing setup, verify everything is working correctly.

### Start the Development Server

```bash
npm run dev
```

The application should be available at `http://localhost:3000`.

### Test Database Connection

Check if Prisma can connect:
```bash
npx prisma db pull
```

### Verify Health Check Endpoint

Access the health check:
```bash
curl http://localhost:3000/api/health
```

Expected response includes:
```json
{
  "status": "healthy",
  "database": "healthy",
  "services": {
    "twilio": "unhealthy",
    "mailgun": "unhealthy",
    "backblaze": "unhealthy"
  }
}
```

Note: External services show as unhealthy if credentials are not configured.

### Test Authentication

1. Navigate to `http://localhost:3000/auth/signin`
2. Log in with admin credentials:
   - Email: `ardabasoglu@gmail.com`
   - Password: `admin123`

### Verify Seeded Data

Check the Prisma Studio interface:
```bash
npm run db:studio
```

Confirm the presence of:
- Users in the `User` table
- Leads in the `Lead` table
- System settings in `SystemSetting`

**Section sources**
- [package.json](file://package.json#L1-L70)
- [DATABASE_SETUP.md](file://docs/DATABASE_SETUP.md#L1-L163)
- [README.md](file://README.md#L0-L147)