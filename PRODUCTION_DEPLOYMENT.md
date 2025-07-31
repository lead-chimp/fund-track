# Production Deployment Guide

This guide covers the complete production deployment process for the Fund Track App.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database server
- SSL certificates for HTTPS
- Environment variables configured
- Domain name configured (processing.merchantfunding.com)

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure environment variables:**
   Edit `.env.production` with your production values:
   - Database connection strings
   - API keys for external services
   - SSL and security settings
   - Backup configuration

## Database Setup

1. **Run database migrations:**
   ```bash
   npm run db:migrate:prod
   ```

2. **Verify database connection:**
   ```bash
   npm run health:check
   ```

## SSL Certificate Setup

1. **Place SSL certificates in the `ssl/` directory:**
   ```bash
   mkdir ssl
   cp your-cert.pem ssl/cert.pem
   cp your-key.pem ssl/key.pem
   ```

2. **Set proper permissions:**
   ```bash
   chmod 600 ssl/key.pem
   chmod 644 ssl/cert.pem
   ```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Check service status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

### Option 2: Manual Deployment

1. **Run deployment script:**
   ```bash
   npm run deploy:prod
   ```

2. **Start the application:**
   ```bash
   npm run start
   ```

## Health Checks

The application provides several health check endpoints:

- **General health:** `GET /api/health`
- **Readiness probe:** `GET /api/health/ready`
- **Liveness probe:** `GET /api/health/live`
- **Metrics:** `GET /api/metrics` (requires authentication)

## Monitoring

### Application Metrics

Access metrics at `/api/metrics` with proper authentication:

```bash
curl -H "Authorization: Bearer YOUR_METRICS_API_KEY" \
     https://processing.merchantfunding.com/api/metrics
```

### Log Files

Logs are stored in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### Health Check Monitoring

Set up monitoring to check health endpoints:

```bash
# Basic health check
curl -f https://processing.merchantfunding.com/api/health

# Detailed health check with jq
curl -s https://processing.merchantfunding.com/api/health | jq '.'
```

## Backup and Recovery

### Automated Backups

Backups run automatically if configured:

```bash
# Manual backup
npm run backup:db

# List available backups
./scripts/disaster-recovery.sh --list-backups

# Restore from latest backup
./scripts/disaster-recovery.sh --latest
```

### Backup Configuration

Set these environment variables for automated backups:

```bash
ENABLE_AUTOMATED_BACKUPS=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_BUCKET=merchant-funding-backups-prod
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

### Common Issues

1. **Database connection errors:**
   ```bash
   # Check database connectivity
   npm run health:check
   
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs db
   ```

2. **SSL certificate issues:**
   ```bash
   # Verify certificate files
   openssl x509 -in ssl/cert.pem -text -noout
   
   # Check certificate expiration
   openssl x509 -in ssl/cert.pem -noout -dates
   ```

3. **High memory usage:**
   ```bash
   # Check application metrics
   curl -s https://processing.merchantfunding.com/api/health | jq '.checks.memory'
   
   # Restart application if needed
   docker-compose -f docker-compose.prod.yml restart app
   ```

### Log Analysis

```bash
# Check error logs
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/combined.log | tail -20

# Monitor real-time logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Maintenance

### Regular Tasks

1. **Update dependencies:**
   ```bash
   npm audit
   npm update
   ```

2. **Database maintenance:**
   ```bash
   # Analyze database performance
   npx prisma db execute --stdin <<< "ANALYZE;"
   
   # Update database statistics
   npx prisma db execute --stdin <<< "VACUUM ANALYZE;"
   ```

3. **Log rotation:**
   ```bash
   # Logs are automatically rotated, but you can manually clean old logs
   find logs/ -name "*.log.*" -mtime +30 -delete
   ```

### Updates and Deployments

1. **Zero-downtime deployment:**
   ```bash
   # Build new image
   docker-compose -f docker-compose.prod.yml build app
   
   # Rolling update
   docker-compose -f docker-compose.prod.yml up -d app
   ```

2. **Database migrations:**
   ```bash
   # Always backup before migrations
   npm run backup:db
   
   # Run migrations
   npm run db:migrate:prod
   ```

## Emergency Procedures

### Application Recovery

1. **Service restart:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart app
   ```

2. **Full system restart:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Database recovery:**
   ```bash
   # Restore from backup
   ./scripts/disaster-recovery.sh --restore-from backup_file.sql
   ```

### Rollback Procedures

1. **Application rollback:**
   ```bash
   # Deploy previous version
   git checkout previous-release-tag
   docker-compose -f docker-compose.prod.yml build app
   docker-compose -f docker-compose.prod.yml up -d app
   ```

2. **Database rollback:**
   ```bash
   # Use disaster recovery script
   ./scripts/disaster-recovery.sh --restore-from previous_backup.sql
   ```

## Support and Monitoring

### Alerting

Set up alerts for:
- Health check failures
- High error rates
- Resource usage thresholds
- Backup failures

### Contact Information

- **System Administrator:** admin@merchantfunding.com
- **Emergency Contact:** [Emergency phone number]
- **Documentation:** This file and inline code comments

## Performance Benchmarks

Expected performance metrics:
- Health check response: < 500ms
- API response time: < 2s (95th percentile)
- Database query time: < 100ms (average)
- Memory usage: < 80% under normal load
- CPU usage: < 70% under normal load

Monitor these metrics regularly and investigate deviations.