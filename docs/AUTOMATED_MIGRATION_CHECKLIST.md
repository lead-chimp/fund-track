# Automated Database Migration Deployment Checklist

This checklist ensures your Dokploy deployment will automatically handle database migrations and seeding.

## Pre-Deployment Setup

### ✅ Environment Variables (Required)

Set these in your Dokploy application environment:

```bash
# Database connection
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth configuration
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-domain.com

# Migration control (optional)
FORCE_SEED=false              # Set to 'true' for initial deployment
SKIP_MIGRATION_CHECK=false    # Emergency skip flag
```

### ✅ Dokploy Configuration

Ensure your Dokploy app is configured with:

- **Build Configuration**: Uses railpack.toml or railpack.json
- **Port**: 3000
- **Health Check Path**: `/api/health`
- **Readiness Check Path**: `/api/health/ready`

### ✅ Files Check

Verify these files are in your repository:

- [ ] `scripts/dokploy-migrate.js` - Dokploy-specific migration script
- [ ] `railpack.toml` - Railpack build configuration
- [ ] `railpack.json` - Alternative Railpack configuration
- [ ] `dokploy.config.js` - Deployment configuration (optional)
- [ ] `prisma/migrations/` - Migration files directory
- [ ] `prisma/seed.ts` - Database seeding script
- [ ] `package.json` - Updated with migration scripts

## Deployment Process

### 1. Initial Deployment

For your first deployment:

```bash
# Set this environment variable for initial seeding
FORCE_SEED=true
```

### 2. Subsequent Deployments

For regular deployments:

```bash
# Keep seeding disabled (default)
FORCE_SEED=false
```

### 3. Migration-Only Deployment

If you only need to run migrations without redeployment:

```bash
# Manual migration command
dokploy exec your-app-name -- npm run db:migrate:deploy
```

## Automated Migration Flow

The system will automatically:

1. ⏳ **Wait for Database** - Up to 2 minutes for DB readiness
2. 🔧 **Generate Prisma Client** - Ensures compatibility
3. 🚀 **Deploy Migrations** - Applies pending migrations
4. 🌱 **Seed Database** - Only if FORCE_SEED=true
5. ✅ **Verify Deployment** - Confirms successful setup
6. 🌟 **Start Application** - Launches Next.js app

## Monitoring & Logs

### Check Migration Status

```bash
# View migration logs
dokploy exec your-app-name -- cat /app/logs/deploy-migrate.log

# Check application logs
dokploy logs your-app-name
```

### Verify Database State

```bash
# Test database connection
dokploy exec your-app-name -- npx prisma db execute --stdin <<< "SELECT 1;"

# Check migration status
dokploy exec your-app-name -- npx prisma migrate status
```

## Troubleshooting

### Common Issues

| Issue             | Solution                                         |
| ----------------- | ------------------------------------------------ |
| Database timeout  | Check DATABASE_URL and network connectivity      |
| Migration lock    | Run `npx prisma migrate reset --force`           |
| Seeding failed    | Check logs, run `npm run db:seed:force` manually |
| Permission errors | Verify file permissions in container             |

### Emergency Procedures

If automated migration fails:

1. **Skip Migration Check**:

   ```bash
   SKIP_MIGRATION_CHECK=true
   ```

2. **Manual Migration**:

   ```bash
   dokploy exec your-app-name -- npx prisma migrate deploy
   ```

3. **Rollback** (if needed):
   ```bash
   dokploy exec your-app-name -- npm run db:migrate:prod --auto-rollback
   ```

## Success Indicators

✅ **Deployment Successful** when you see:

- "🎉 Deployment migration and seeding completed successfully!"
- Application responds to health checks
- Database queries work correctly
- No error logs in migration log file

## Contact & Support

For issues with automated migrations:

1. Check the migration logs first
2. Verify environment variables
3. Test database connectivity
4. Review Dokploy deployment logs
