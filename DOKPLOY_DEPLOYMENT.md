# Dokploy Deployment Guide

This guide explains how to deploy the Fund Track application using Dokploy with Railpack.

## Build Configuration

### Railpack Configuration

Dokploy uses Railpack for builds. The application includes both `railpack.toml` and `railpack.json` configurations:

**railpack.toml:**

```toml
[variables]
SKIP_ENV_VALIDATION = "true"
DATABASE_URL = "postgresql://placeholder:placeholder@placeholder:5432/placeholder"
PRISMA_CLI_BINARY_TARGETS = "linux-musl,native"
NODE_ENV = "production"

[phases.setup]
nixPkgs = ["nodejs_20", "npm"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = [
  "npx prisma generate",
  "npm run build"
]

[phases.start]
cmd = "npm start"
```

### Environment Variables for Build

Set these environment variables in your Dokploy build configuration:

```bash
SKIP_ENV_VALIDATION=true
DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
PRISMA_CLI_BINARY_TARGETS=linux-musl,native
NODE_ENV=production
```

### Build Commands

Railpack will automatically run:

1. `npm ci` - Install dependencies
2. `npx prisma generate` - Generate Prisma client
3. `npm run build` - Build the Next.js application

### Manual Build Script

If needed, you can use the provided build script:

```bash
./scripts/railpack-build.sh
```

## Runtime Configuration

### Required Environment Variables

Set these in your Dokploy application environment:

```bash
# Database
DATABASE_URL=postgresql://postgres:K8mX9vN2wer5Bgh5uE3yT6zA1B4fGty67Nhju@merchant-funding-fundtrackdb-ghvfoz:5432/fund_track_app

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-domain.com

# Other required variables...
```

### Health Checks

Configure health checks in Dokploy:

- **Health Check Path**: `/api/health`
- **Readiness Check Path**: `/api/health/ready`
- **Port**: `3000`

## Troubleshooting

### Database Connection Error During Build

If you see errors like:

```
Can't reach database server at merchant-funding-fundtrackdb-ghvfoz:5432
Invalid prisma.$queryRaw() invocation
```

This means the build process is trying to connect to the database. Ensure:

1. `SKIP_ENV_VALIDATION=true` is set in build environment
2. Build-time `DATABASE_URL` is set to a placeholder value
3. The application code properly checks for build-time conditions

### Nixpacks Configuration

If using Nixpacks, ensure your `nixpacks.toml` includes:

```toml
[phases.build]
cmds = ["npm ci", "SKIP_ENV_VALIDATION=true npm run build"]

[phases.start]
cmd = "npm start"
```

## Database Migration for Dokploy

Database migrations are fully automated and run via Dokploy's postDeploy hook after successful application deployment. The migration process is integrated into the deployment workflow and will fail the deployment if critical migration errors occur.

### How It Works

After your application is successfully deployed through Railpack, the postDeploy hook executes:

1. **Database Connectivity Check** - Waits up to 2 minutes for database availability
2. **Prisma Client Generation** - Ensures client matches current schema
3. **Migration Deployment** - Applies pending migrations via `prisma migrate deploy`
4. **Optional Seeding** - Seeds database if `FORCE_SEED=true` environment variable is set
5. **Verification** - Confirms successful database setup
6. **Deployment Completion** - Marks deployment as successful or failed based on migration results

### Environment Variables for Migration Control

Set these in your Dokploy application environment:

```bash
# Database seeding control (set to true for initial deployment)
FORCE_SEED=false

# Emergency skip flag (use only if migrations are causing deployment failures)
SKIP_MIGRATION_CHECK=false
```

### Available Scripts

```bash
# Dokploy-specific migration script (used automatically)
npm run db:migrate:dokploy

# Force seeding (useful for initial setup or data refresh)
npm run db:seed:force

# Traditional production migration with backup (manual use)
npm run db:migrate:prod
```

### Manual Migration Commands

If you need to run migrations manually after deployment:

```bash
# Via Dokploy exec - automated migration script
dokploy exec your-app-name -- npm run db:migrate:dokploy

# Direct Prisma migration deployment
dokploy exec your-app-name -- npx prisma migrate deploy

# Force database seeding
dokploy exec your-app-name -- npm run db:seed:force

# Check migration status
dokploy exec your-app-name -- npx prisma migrate status
```

### Migration Troubleshooting

The automated migration system includes comprehensive error handling and logging:

#### Common Issues and Solutions

1. **Database Connection Timeouts**

   - The system waits up to 2 minutes for database connectivity
   - Check DATABASE_URL environment variable
   - Verify database server is running and accessible

2. **Migration Lock Issues**

   ```bash
   # Clear migration locks if needed
   dokploy exec your-app-name -- npx prisma migrate reset --force
   ```

3. **Seeding Failures**

   - Seeding failures don't stop deployment (by design)
   - Check logs for seeding issues: `dokploy logs your-app-name`
   - Manually run seeding: `dokploy exec your-app-name -- npm run db:seed:force`

4. **Permission Issues**
   - Ensure nextjs user has access to migration files
   - Check file permissions in container

#### Debug Commands

```bash
# Check if migration files exist in the container
dokploy exec your-app-name -- ls -la /app/prisma/migrations/

# View migration logs
dokploy exec your-app-name -- cat /app/logs/deploy-migrate.log

# Test database connectivity
dokploy exec your-app-name -- npx prisma db execute --stdin <<< "SELECT 1;"

# Run the debug script
dokploy exec your-app-name -- /app/scripts/debug-migrations.sh

# Check container logs for migration errors
dokploy logs your-app-name
```

#### Migration Workflow

The automated migration system follows this workflow via postDeploy hook:

1. **Application Deployment**: Railpack builds and starts the Next.js application
2. **PostDeploy Hook Trigger**: Dokploy executes the migration script after successful deployment
3. **Database Readiness Check**: Waits for database to be available
4. **Prisma Client Generation**: Ensures client is compatible with schema
5. **Migration Deployment**: Applies pending migrations
6. **Optional Seeding**: Seeds database if FORCE_SEED=true
7. **Verification**: Confirms successful deployment
8. **Deployment Status**: Marks deployment as successful or failed based on migration results

#### Logs and Monitoring

Migration logs are stored in `/app/logs/deploy-migrate.log` and include:

- Timestamp for each operation
- Success/failure status
- Detailed error messages
- Retry attempts
- Database connectivity checks

## Monitoring

The application provides several monitoring endpoints:

- `/api/health` - Comprehensive health check
- `/api/health/ready` - Readiness probe for container orchestration
- `/api/health/live` - Liveness probe (if implemented)
