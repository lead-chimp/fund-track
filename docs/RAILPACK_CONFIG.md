# Railpack Configuration for Dokploy

This document explains the Railpack-specific configuration for deploying Fund Track with Dokploy.

## Overview

Dokploy uses Railpack (successor to Nixpacks) for building applications. This project includes proper Railpack configuration to handle Prisma migrations and Next.js builds.

## Configuration Files

### railpack.toml

Primary configuration file for Railpack with build phases and environment variables.

### railpack.json

Alternative JSON format configuration (both are included for compatibility).

### dokploy.config.js

Dokploy-specific configuration with build commands and runtime settings.

## Key Features

- ✅ Proper Prisma client generation during build
- ✅ Database migration handling at runtime
- ✅ Binary target configuration for Alpine Linux
- ✅ Environment variable isolation between build and runtime
- ✅ Comprehensive error handling and debugging

## Build Process

1. **Setup Phase**: Install Node.js 20 and npm
2. **Install Phase**: Run `npm ci`
3. **Build Phase**:
   - Generate Prisma client
   - Build Next.js application
4. **Start Phase**: Run the application with migrations

## Debugging

If deployment fails:

1. Check build logs in Dokploy dashboard
2. Use the debug script: `dokploy exec your-app-name -- /app/scripts/debug-migrations.sh`
3. Validate configuration: `./scripts/validate-deployment.sh`

## Migration Handling

- Migration files are copied during Docker build
- Migrations run automatically at container startup
- Comprehensive error reporting for migration failures
- Fallback debugging information

## Environment Variables

### Build Time

- `SKIP_ENV_VALIDATION=true`
- `DATABASE_URL=postgresql://placeholder:...` (placeholder for build)
- `PRISMA_CLI_BINARY_TARGETS=linux-musl,native`
- `NODE_ENV=production`

### Runtime

- Real `DATABASE_URL` from Dokploy environment
- `NEXTAUTH_SECRET` and other app-specific variables

## Troubleshooting

Common issues and solutions:

1. **Migration files not found**: Check Docker build logs, ensure files are copied
2. **Prisma client errors**: Verify binary targets in Railpack config
3. **Database connection issues**: Check DATABASE_URL format and network connectivity
4. **Build failures**: Use `./scripts/railpack-build.sh` for local testing

## Support Scripts

- `scripts/railpack-build.sh` - Manual build script
- `scripts/debug-migrations.sh` - Runtime debugging
- `scripts/validate-deployment.sh` - Pre-deployment validation
