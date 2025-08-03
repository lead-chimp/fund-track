# Dokploy Deployment Guide

This guide explains how to deploy the Fund Track application using Dokploy with Nixpacks.

## Build Configuration

### Environment Variables for Build

Set these environment variables in your Dokploy build configuration:

```bash
SKIP_ENV_VALIDATION=true
DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
```

### Build Command

Dokploy should use the following build command:
```bash
npm run build
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

After deployment, run database migrations:

```bash
npm run db:migrate:prod
```

## Monitoring

The application provides several monitoring endpoints:

- `/api/health` - Comprehensive health check
- `/api/health/ready` - Readiness probe for container orchestration
- `/api/health/live` - Liveness probe (if implemented)