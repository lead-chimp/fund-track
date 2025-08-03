# Dokploy Database Migration Automation

This document explains the automated database migration system for Dokploy deployments.

## Overview

The `scripts/dokploy-migrate.js` script automatically handles database migrations and seeding during Dokploy deployments. It runs as part of the Railpack start phase, ensuring migrations are applied before the application starts.

## How It Works

### Deployment Flow

1. **Dokploy deployment starts** via Railpack
2. **Setup phase**: Install Node.js 20 and npm
3. **Install phase**: Run `npm ci` to install dependencies
4. **Build phase**:
   - Generate Prisma client: `npx prisma generate`
   - Build application: `npm run build`
5. **Start phase**:
   - **Run migrations**: `node scripts/dokploy-migrate.js`
   - **Start application**: `npm start`

### Migration Script Features

- ✅ **Database connectivity check** with 2-minute timeout
- ✅ **Automatic retries** (3 attempts with exponential backoff)
- ✅ **Prisma client generation** before migrations
- ✅ **Migration deployment** using `prisma migrate deploy`
- ✅ **Database seeding** using `npm run db:seed`
- ✅ **Comprehensive logging** with timestamps
- ✅ **Error handling** with detailed troubleshooting steps

## Configuration

### Railpack Configuration

The migration is configured in `railpack.toml` (single configuration file):

```toml
[phases.start]
cmd = "node scripts/dokploy-migrate.js && npm start"
```

**Note**: We use only `railpack.toml` to avoid configuration conflicts. The `railpack.json` file has been removed.

### Environment Variables

The script relies on Dokploy's environment variables:

- `DATABASE_URL`: PostgreSQL connection string (set by Dokploy)
- `NODE_ENV`: Set to "production" in railpack.toml

### NPM Scripts

Additional scripts in `package.json`:

- `db:migrate:dokploy`: Manual migration execution
- `db:seed`: Database seeding (if it exists)

## Testing

### ⚠️ Local Testing Limitations

**The migration script cannot be fully tested locally** because:

- The database hostname (`merchant-funding-fundtrackdb-ghvfoz`) is internal to Dokploy's network
- Local machines cannot reach Dokploy's internal database servers
- This is expected and secure behavior

### What We Can Test Locally

- ✅ Script syntax and logic
- ✅ Environment variable handling
- ✅ Prisma command construction
- ✅ Error handling and logging

### Test Commands

```bash
# Test without DATABASE_URL (will fail as expected)
npm run db:migrate:dokploy

# Test with DATABASE_URL (will timeout waiting for unreachable database)
DATABASE_URL='postgresql://postgres:K8mX9vN2wer5Bgh5uE3yT6zA1B4fGty67Nhju@merchant-funding-fundtrackdb-ghvfoz:5432/fund_track_app' node scripts/dokploy-migrate.js
```

## Deployment

### Automatic Execution

The migration script runs automatically during every Dokploy deployment as part of the start phase.

### Manual Execution in Dokploy

If needed, you can manually run migrations in Dokploy's environment:

```bash
npm run db:migrate:dokploy
```

## Monitoring

### Logs

Migration logs are available in:

- `./logs/dokploy-migrate.log` (if logging is configured)
- Dokploy deployment logs
- Application console output

### Success Indicators

- ✅ "Migration deployment successful"
- ✅ "Database seeding completed successfully"
- ✅ Application starts normally

### Failure Indicators

- ❌ Database connectivity timeout
- ❌ Migration deployment failures
- ❌ Deployment process stops

## Troubleshooting

### Common Issues

1. **Database not accessible**

   - Check DATABASE_URL environment variable
   - Verify database server is running
   - Ensure network connectivity in Dokploy

2. **Migration failures**

   - Check migration files exist in `prisma/migrations/`
   - Verify Prisma schema is valid
   - Review detailed error logs

3. **Timeout issues**
   - Database might be starting up (normal during deployment)
   - Script waits up to 2 minutes for database
   - Check Dokploy resource limits

### Manual Recovery

If automated migration fails:

```bash
# In Dokploy environment
npx prisma migrate deploy
npm run db:seed
npm start
```

## Migration Status

Current pending migrations (as of last check):

- `20240101000000_init`
- `20250728210021_initial_migration`
- `20250730060039_add_lead_status_history`

These will be applied automatically on the next deployment.

## Security Notes

- Database credentials are managed by Dokploy
- Connection strings are not exposed in logs
- Migration script only runs in production environment
- Local testing is intentionally limited for security
