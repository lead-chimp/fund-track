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

## Database Migration

Database migrations and seeding are now fully automated during deployment. The system provides multiple approaches:

### Automated Migration (Recommended)

The application now includes automated migration scripts that run during deployment:

1. **Pre-start Hook**: Runs migrations before the app starts
2. **Post-deploy Hook**: Runs after successful deployment
3. **Docker Entrypoint**: Handles migrations in containerized environments

#### Configuration

Set these environment variables in Dokploy for automated migration control:

```bash
# Force database seeding (usually only for initial deployment)
FORCE_SEED=true

# Skip migration validation (for emergency deployments)
SKIP_MIGRATION_CHECK=false
```

#### Available Scripts

```bash
# Automated deployment migration (recommended)
npm run db:migrate:deploy

# Force seeding (useful for initial setup)
npm run db:seed:force

# Traditional production migration with backup
npm run db:migrate:prod
```

### Manual Migration (Fallback)

If automated migration fails, you can run migrations manually:

```bash
# For manual migration after deployment
dokploy exec your-app-name -- npx prisma migrate deploy

# Run the automated migration script manually
dokploy exec your-app-name -- node /app/scripts/deploy-migrate.js

# Force seeding
dokploy exec your-app-name -- node /app/scripts/deploy-migrate.js --seed

# For debugging migration issues
dokploy exec your-app-name -- /app/scripts/debug-migrations.sh

# Alternative: using the production migration script with backup
dokploy exec your-app-name -- npm run db:migrate:prod
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

The automated migration system follows this workflow:

1. **Database Readiness Check**: Waits for database to be available
2. **Prisma Client Generation**: Ensures client is compatible with schema
3. **Migration Deployment**: Applies pending migrations
4. **Optional Seeding**: Seeds database if FORCE_SEED=true
5. **Verification**: Confirms successful deployment
6. **Application Startup**: Starts the Next.js application

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
