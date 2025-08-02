# Production Deployment Guide

This guide covers the complete production deployment process for the Fund Track App using Dokploy.

## Prerequisites

- Dokploy server instance running
- Access to Dokploy dashboard
- Git repository access
- Domain name configured (processing.merchantfunding.com)
- Environment variables prepared

## Dokploy Setup

### 1. Initial Dokploy Configuration

1. **Access Dokploy Dashboard:**
   Navigate to your Dokploy instance at `https://your-dokploy-domain.com`

2. **Create New Application:**
   - Click "Create Application"
   - Choose "Docker" as deployment type
   - Connect your Git repository

3. **Configure Git Integration:**
   - Repository URL: `https://github.com/your-username/fund-track-app`
   - Branch: `main` (or your production branch)
   - Auto-deploy on push: Enable

### 2. Environment Variables Configuration

In the Dokploy dashboard, configure the following environment variables:

```bash
# Core Application
NODE_ENV=production
NEXTAUTH_URL=https://processing.merchantfunding.com
NEXTAUTH_SECRET=your-nextauth-secret

# Database
DATABASE_URL=postgresql://username:password@db:5432/fund_track_app

# External Services
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-mailgun-domain
MAILGUN_FROM_EMAIL=noreply@merchantfunding.com

# File Storage
B2_APPLICATION_KEY_ID=your-b2-key-id
B2_APPLICATION_KEY=your-b2-key
B2_BUCKET_NAME=your-b2-bucket
B2_BUCKET_ID=your-b2-bucket-id

# Legacy Database Integration
LEGACY_DB_SERVER=your-legacy-db-server
LEGACY_DB_PORT=1433
LEGACY_DB_USER=your-legacy-db-user
LEGACY_DB_PASSWORD=your-legacy-db-password
LEGACY_DB_DATABASE=your-legacy-db-name

# Application Settings
ENABLE_BACKGROUND_JOBS=true
LOG_LEVEL=info
FORCE_HTTPS=true
SECURE_COOKIES=true
ENABLE_RATE_LIMITING=true
ENABLE_AUTOMATED_BACKUPS=true
```

## Database Setup

### 1. PostgreSQL Service in Dokploy

1. **Create PostgreSQL Service:**
   - In Dokploy dashboard, go to "Services"
   - Click "Create Service" → "PostgreSQL"
   - Configure database credentials
   - Set database name: `fund_track_app`

2. **Database Connection:**
   - Use the internal service name for DATABASE_URL
   - Format: `postgresql://username:password@postgres-service:5432/fund_track_app`

### 2. Database Migrations

Migrations will run automatically during deployment via the Dockerfile, but you can also run them manually:

1. **Access application container:**
   ```bash
   dokploy exec your-app-name -- npm run db:migrate:prod
   ```

2. **Verify database connection:**
   ```bash
   dokploy exec your-app-name -- npm run health:check
   ```

## SSL and Domain Configuration

### 1. Domain Setup in Dokploy

1. **Configure Domain:**
   - In your application settings, go to "Domains"
   - Add your domain: `processing.merchantfunding.com`
   - Enable "Generate SSL Certificate" (Let's Encrypt)
   - Dokploy will automatically handle SSL certificate generation and renewal

2. **DNS Configuration:**
   - Point your domain's A record to your Dokploy server IP
   - Ensure DNS propagation is complete before SSL generation

## Deployment Process

### 1. Automatic Deployment

Dokploy handles deployment automatically:

1. **Git Push Deployment:**
   - Push changes to your configured branch (main)
   - Dokploy automatically detects changes
   - Builds new Docker image using your Dockerfile
   - Deploys with zero downtime

2. **Manual Deployment:**
   - In Dokploy dashboard, go to your application
   - Click "Deploy" to trigger manual deployment
   - Monitor deployment progress in real-time

### 2. Deployment Configuration

1. **Build Settings:**
   - Build context: `/` (root directory)
   - Dockerfile path: `./Dockerfile`
   - Build args: (if needed)

2. **Runtime Settings:**
   - Port: `3000`
   - Health check: `/api/health`
   - Restart policy: `unless-stopped`

### 3. Monitoring Deployment

1. **View Deployment Logs:**
   - Real-time logs in Dokploy dashboard
   - Build logs and runtime logs separated
   - Filter by log level and time range

2. **Check Application Status:**
   - Service status indicators in dashboard
   - Health check status
   - Resource usage metrics

## Health Checks and Monitoring

### 1. Application Health Checks

The application provides several health check endpoints:

- **General health:** `GET /api/health`
- **Readiness probe:** `GET /api/health/ready`
- **Liveness probe:** `GET /api/health/live`
- **Metrics:** `GET /api/metrics` (requires authentication)

### 2. Dokploy Health Monitoring

1. **Configure Health Checks:**
   - Health check path: `/api/health`
   - Health check interval: `30s`
   - Health check timeout: `10s`
   - Failure threshold: `3`

2. **Automatic Recovery:**
   - Dokploy automatically restarts unhealthy containers
   - Configurable restart policies
   - Alert notifications on failures

### 3. Application Metrics

Access metrics at `/api/metrics` with proper authentication:

```bash
curl -H "Authorization: Bearer YOUR_METRICS_API_KEY" \
     https://processing.merchantfunding.com/api/metrics
```

### 4. Log Management

1. **Dokploy Log Viewer:**
   - Real-time log streaming in dashboard
   - Log filtering and search capabilities
   - Download logs for offline analysis

2. **Application Logs:**
   - Logs are automatically collected by Dokploy
   - Structured logging with JSON format
   - Log retention policies configurable

3. **Log Access:**
   ```bash
   # View real-time logs
   dokploy logs your-app-name --follow
   
   # View specific number of lines
   dokploy logs your-app-name --tail 100
   
   # Filter by log level
   dokploy logs your-app-name --level error
   ```

### 5. Performance Monitoring

1. **Resource Usage:**
   - CPU and memory usage in Dokploy dashboard
   - Historical resource usage graphs
   - Configurable resource limits and alerts

2. **Health Check Monitoring:**
   ```bash
   # Basic health check
   curl -f https://processing.merchantfunding.com/api/health
   
   # Detailed health check with jq
   curl -s https://processing.merchantfunding.com/api/health | jq '.'
   ```

## Backup and Recovery

### 1. Database Backups

1. **Automated PostgreSQL Backups:**
   - Configure in Dokploy PostgreSQL service settings
   - Set backup schedule (e.g., daily at 2 AM)
   - Retention policy (e.g., 30 days)
   - Backup storage location

2. **Manual Database Backup:**
   ```bash
   # Create manual backup
   dokploy exec postgres-service -- pg_dump -U username fund_track_app > backup.sql
   
   # Or use application backup script
   dokploy exec your-app-name -- npm run backup:db
   ```

### 2. Application Backups

1. **Volume Backups:**
   - Dokploy automatically backs up persistent volumes
   - Configure backup frequency and retention
   - Backup includes logs and uploaded files

2. **Configuration Backup:**
   - Environment variables are backed up with Dokploy
   - Application configuration stored in Git
   - Dokploy deployment configuration exportable

### 3. Backup Configuration

Set these environment variables for automated backups:

```bash
ENABLE_AUTOMATED_BACKUPS=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_BUCKET=fund-track-backups-prod
```

## Security

### Security Headers

The application automatically sets security headers:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting

Rate limiting is enabled by default:
- API endpoints: 100 requests per 15 minutes
- General endpoints: Higher limits for normal usage

### HTTPS Enforcement

HTTPS is enforced in production when `FORCE_HTTPS=true`.

## Performance Optimization

### Caching

- Static assets are cached with long expiration times
- Database queries use connection pooling
- Redis can be used for session storage (optional)

### Resource Limits

Monitor resource usage through health checks:
- Memory usage alerts at 90%
- Disk usage alerts at 90%
- Database connection pool monitoring

## Troubleshooting

### 1. Common Issues

1. **Database connection errors:**
   ```bash
   # Check database connectivity
   dokploy exec your-app-name -- npm run health:check
   
   # Check database service status
   dokploy status postgres-service
   
   # View database logs
   dokploy logs postgres-service
   ```

2. **SSL certificate issues:**
   - Check domain configuration in Dokploy dashboard
   - Verify DNS records are pointing to correct IP
   - Regenerate SSL certificate if needed
   - Check certificate status in dashboard

3. **High memory usage:**
   ```bash
   # Check application metrics
   curl -s https://processing.merchantfunding.com/api/health | jq '.checks.memory'
   
   # Restart application via Dokploy dashboard or CLI
   dokploy restart your-app-name
   ```

4. **Deployment failures:**
   - Check build logs in Dokploy dashboard
   - Verify Dockerfile syntax and dependencies
   - Check environment variables configuration
   - Ensure sufficient resources allocated

### 2. Log Analysis

1. **Using Dokploy Dashboard:**
   - Real-time log viewer with filtering
   - Search logs by keywords or time range
   - Export logs for external analysis

2. **Using CLI:**
   ```bash
   # Check error logs
   dokploy logs your-app-name --level error
   
   # Search for specific errors
   dokploy logs your-app-name | grep "ERROR" | tail -20
   
   # Monitor real-time logs
   dokploy logs your-app-name --follow
   ```

### 3. Service Management

```bash
# Check service status
dokploy status your-app-name

# Restart service
dokploy restart your-app-name

# Scale service (if configured)
dokploy scale your-app-name --replicas 2

# View service configuration
dokploy inspect your-app-name
```

## Maintenance

### 1. Regular Tasks

1. **Update dependencies:**
   - Update package.json in your repository
   - Push changes to trigger automatic deployment
   - Dokploy will rebuild with new dependencies

2. **Database maintenance:**
   ```bash
   # Analyze database performance
   dokploy exec postgres-service -- psql -U username -d fund_track_app -c "ANALYZE;"
   
   # Update database statistics
   dokploy exec postgres-service -- psql -U username -d fund_track_app -c "VACUUM ANALYZE;"
   ```

3. **Log management:**
   - Logs are automatically managed by Dokploy
   - Configure log retention policies in dashboard
   - Old logs are automatically cleaned based on retention settings

### 2. Updates and Deployments

1. **Zero-downtime deployment:**
   - Dokploy handles zero-downtime deployments automatically
   - Rolling updates with health checks
   - Automatic rollback on deployment failures

2. **Database migrations:**
   ```bash
   # Migrations run automatically during deployment
   # For manual migration:
   dokploy exec your-app-name -- npm run db:migrate:prod
   ```

3. **Application updates:**
   - Push code changes to Git repository
   - Dokploy automatically detects and deploys
   - Monitor deployment progress in dashboard

### 3. Scaling and Performance

1. **Horizontal scaling:**
   ```bash
   # Scale application instances
   dokploy scale your-app-name --replicas 3
   
   # Configure load balancing
   # (Done automatically by Dokploy)
   ```

2. **Resource management:**
   - Monitor resource usage in dashboard
   - Adjust CPU and memory limits as needed
   - Set up auto-scaling rules (if supported)

## Emergency Procedures

### 1. Application Recovery

1. **Service restart:**
   ```bash
   # Restart via dashboard or CLI
   dokploy restart your-app-name
   ```

2. **Full system restart:**
   ```bash
   # Restart all services
   dokploy restart your-app-name
   dokploy restart postgres-service
   ```

3. **Database recovery:**
   ```bash
   # Restore from backup via Dokploy dashboard
   # Or manually restore
   dokploy exec postgres-service -- psql -U username -d fund_track_app < backup.sql
   ```

### 2. Rollback Procedures

1. **Application rollback:**
   - Use Dokploy dashboard to rollback to previous deployment
   - Select previous successful deployment from history
   - Click "Rollback" to revert automatically

2. **Manual rollback:**
   ```bash
   # Rollback to specific Git commit
   git checkout previous-release-tag
   git push origin main --force
   # Dokploy will automatically deploy the rollback
   ```

3. **Database rollback:**
   ```bash
   # Restore from specific backup
   dokploy exec postgres-service -- psql -U username -d fund_track_app < previous_backup.sql
   ```

### 3. Disaster Recovery

1. **Complete system failure:**
   - Restore Dokploy configuration from backup
   - Recreate services using saved configurations
   - Restore database from latest backup
   - Redeploy application from Git repository

2. **Data corruption:**
   - Stop application to prevent further damage
   - Restore database from known good backup
   - Verify data integrity before resuming service

## Support and Monitoring

### 1. Alerting and Notifications

1. **Dokploy Alerts:**
   - Configure alerts in Dokploy dashboard
   - Set up notifications for deployment failures
   - Monitor resource usage thresholds
   - Health check failure notifications

2. **Alert Types:**
   - Health check failures
   - High error rates
   - Resource usage thresholds (CPU > 80%, Memory > 90%)
   - Backup failures
   - SSL certificate expiration warnings

3. **Notification Channels:**
   - Email notifications
   - Slack/Discord webhooks
   - SMS alerts (if configured)

### 2. Contact Information

- **System Administrator:** admin@merchantfunding.com
- **Emergency Contact:** [Emergency phone number]
- **Dokploy Dashboard:** https://your-dokploy-domain.com
- **Documentation:** This file and inline code comments

### 3. Performance Benchmarks

Expected performance metrics:
- Health check response: < 500ms
- API response time: < 2s (95th percentile)
- Database query time: < 100ms (average)
- Memory usage: < 80% under normal load
- CPU usage: < 70% under normal load

Monitor these metrics regularly through Dokploy dashboard and investigate deviations.

### 4. Dokploy-Specific Features

1. **Dashboard Monitoring:**
   - Real-time service status
   - Resource usage graphs
   - Deployment history
   - Log aggregation

2. **Automated Management:**
   - Auto-restart on failures
   - Automatic SSL certificate renewal
   - Git-based deployments
   - Built-in load balancing

3. **Integration Capabilities:**
   - Webhook notifications
   - API access for automation
   - Third-party monitoring integration
   - Custom health check endpoints

## Quick Reference Commands

```bash
# View application status
dokploy status your-app-name

# View logs
dokploy logs your-app-name --follow

# Restart application
dokploy restart your-app-name

# Scale application
dokploy scale your-app-name --replicas 2

# Execute command in container
dokploy exec your-app-name -- npm run health:check

# View deployment history
dokploy deployments your-app-name

# Rollback to previous deployment
dokploy rollback your-app-name --to-deployment deployment-id
```