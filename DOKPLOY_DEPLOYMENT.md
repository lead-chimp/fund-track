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

Database migrations run automatically during container startup via the docker-entrypoint.sh script. However, if you need to run them manually:

```bash
# For manual migration after deployment
dokploy exec your-app-name -- npx prisma migrate deploy

# For debugging migration issues
dokploy exec your-app-name -- /app/scripts/debug-migrations.sh

# Alternative: using the production migration script
dokploy exec your-app-name -- npm run db:migrate:prod
```

### Migration Troubleshooting

If migrations fail during deployment, check:

1. **Migration files are present**: The migration files should be copied during the Docker build
2. **Database connectivity**: Ensure DATABASE_URL is correctly set in runtime environment
3. **Migration permissions**: Check that the nextjs user has access to migration files

Debug commands:
```bash
# Check if migration files exist in the container
dokploy exec your-app-name -- ls -la /app/prisma/migrations/

# Run the debug script
dokploy exec your-app-name -- /app/scripts/debug-migrations.sh

# Check logs for migration errors
dokploy logs your-app-name
```

## Monitoring

The application provides several monitoring endpoints:

- `/api/health` - Comprehensive health check
- `/api/health/ready` - Readiness probe for container orchestration
- `/api/health/live` - Liveness probe (if implemented)