# Dokploy Database Migration Setup

Your application is now configured for automated database migrations and seeding through Dokploy deployment.

## How It Works

### Automated Process

When you deploy through Dokploy, the Railpack configuration automatically:

1. Builds your application (`npm ci`, `npx prisma generate`, `npm run build`)
2. **Before starting the app**, runs `node scripts/dokploy-migrate.js`
3. This script handles database connectivity, migrations, and optional seeding
4. Finally starts your Next.js application with `npm start`

### Configuration Files

- `railpack.toml` - Contains the start command that runs migrations before app startup
- `scripts/dokploy-migrate.js` - The main migration script optimized for Dokploy
- `package.json` - Includes new script `db:migrate:dokploy`

## Environment Variables

Set these in your Dokploy application environment:

```bash
# Your actual database connection
DATABASE_URL=postgresql://postgres:K8mX9vN2wer5Bgh5uE3yT6zA1B4fGty67Nhju@merchant-funding-fundtrackdb-ghvfoz:5432/fund_track_app

# Migration control
FORCE_SEED=false              # Set to true only for initial deployment
SKIP_MIGRATION_CHECK=false    # Emergency skip (use only if migrations fail)

# Your existing environment variables from .env.production
NEXTAUTH_SECRET=production-secret-key-minimum-32-characters-long
NEXTAUTH_URL=https://fund-track-test-j7bbnv-0cd2f6-205-237-194-80.traefik.me/
# ... etc
```

## Deployment Steps

### Initial Deployment (First Time)

1. Set `FORCE_SEED=true` in Dokploy environment variables
2. Deploy your application
3. Migrations will run automatically and database will be seeded

### Regular Deployments

1. Keep `FORCE_SEED=false` (default)
2. Deploy your application
3. Only migrations will run (no seeding)

## Manual Commands (if needed)

```bash
# Run migrations manually
dokploy exec your-app-name -- npm run db:migrate:dokploy

# Force seeding
dokploy exec your-app-name -- npm run db:seed:force

# Check migration status
dokploy exec your-app-name -- npx prisma migrate status

# View migration logs
dokploy exec your-app-name -- cat logs/dokploy-migrate.log
```

## Troubleshooting

### Common Issues

- **Database timeout**: Check DATABASE_URL is correct and database is accessible
- **Migration locks**: Usually resolve automatically with retry logic
- **Seeding failures**: Won't stop deployment, check logs for details

### Debug Steps

1. Check Dokploy application logs: `dokploy logs your-app-name`
2. Check migration logs: `dokploy exec your-app-name -- cat logs/dokploy-migrate.log`
3. Test database connection: `dokploy exec your-app-name -- npx prisma db execute --stdin <<< "SELECT 1;"`

## What's Different from Docker

- No Docker configuration needed
- Uses Railpack's native start command
- Simplified script without Docker-specific features
- Direct integration with Dokploy's build and deployment process
- Logs stored in `logs/dokploy-migrate.log` instead of Docker logs

Your deployment is now fully automated! 🎉
