# Dokploy Deployment Troubleshooting Guide

This guide addresses common issues when deploying the Fund Track App to Dokploy.

## Database Connection Issues During Build

### Problem
You may encounter errors like:
```
Can't reach database server at `merchant-funding-fundtrackdb-ghvfoz:5432`
Invalid `prisma.$queryRaw()` invocation
```

### Root Cause
This happens because Prisma tries to connect to the database during the Docker build process, but the database service isn't available at build time.

### Solution
The Dockerfile has been updated to handle this issue:

1. **Build-time Database URL**: A placeholder DATABASE_URL is set during build
2. **Runtime Database Setup**: Database migrations run when the container starts
3. **Entrypoint Script**: Handles database setup and connection waiting

### Updated Dockerfile Features
- Uses placeholder DATABASE_URL during build
- Includes entrypoint script for runtime database setup
- Waits for database to be ready before starting the application
- Runs migrations automatically on startup

## Deployment Steps

### 1. PostgreSQL Service Setup in Dokploy

Create a PostgreSQL service with these settings:
- **Service Name**: `postgres-prod` (or your preferred name)
- **Database Name**: `fund_track_app`
- **Username**: `postgres`
- **Password**: Generate a secure password
- **Version**: PostgreSQL 15
- **Memory**: 1GB (adjust based on needs)
- **Storage**: 10GB (adjust based on needs)

### 2. Environment Variables Configuration

Set these environment variables in your Dokploy application:

```bash
# Database (use your actual PostgreSQL service name and credentials)
DATABASE_URL="postgresql://postgres:your-password@your-postgres-service-name:5432/fund_track_app"

# Core Application
NODE_ENV="production"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secure-secret-key-minimum-32-characters"

# External Services
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="your-twilio-number"
MAILGUN_API_KEY="your-mailgun-key"
MAILGUN_DOMAIN="your-mailgun-domain"
MAILGUN_FROM_EMAIL="noreply@your-domain.com"

# File Storage
B2_APPLICATION_KEY_ID="your-b2-key-id"
B2_APPLICATION_KEY="your-b2-key"
B2_BUCKET_NAME="your-b2-bucket"
B2_BUCKET_ID="your-b2-bucket-id"

# Legacy Database (if applicable)
LEGACY_DB_SERVER="your-legacy-db-server"
LEGACY_DB_PORT="1433"
LEGACY_DB_USER="your-legacy-db-user"
LEGACY_DB_PASSWORD="your-legacy-db-password"
LEGACY_DB_DATABASE="your-legacy-db-name"

# Application Settings
ENABLE_BACKGROUND_JOBS="true"
LOG_LEVEL="info"
FORCE_HTTPS="true"
SECURE_COOKIES="true"
```

### 3. Network Configuration

Ensure your application and PostgreSQL service are on the same Docker network in Dokploy:
- Both services should use the internal Docker network
- Use the PostgreSQL service name in the DATABASE_URL
- Don't expose PostgreSQL to external networks for security

### 4. Deployment Process

1. **Create PostgreSQL Service**: Set up the database service first
2. **Configure Environment Variables**: Add all required environment variables
3. **Deploy Application**: Deploy your application with the updated Dockerfile
4. **Monitor Startup**: Check logs to ensure database migrations complete successfully

## Common Issues and Solutions

### Issue: "Database is not ready after 30 attempts"

**Cause**: PostgreSQL service is not running or not accessible

**Solution**:
1. Check PostgreSQL service status in Dokploy
2. Verify service name in DATABASE_URL matches actual service name
3. Ensure both services are on the same network
4. Check PostgreSQL service logs for errors

### Issue: "Database migrations failed"

**Cause**: Database schema issues or permission problems

**Solution**:
1. Check database user permissions
2. Verify database name exists
3. Review migration files for syntax errors
4. Check application logs for detailed error messages

### Issue: "Prisma client generation failed"

**Cause**: Schema file issues or missing dependencies

**Solution**:
1. Verify `prisma/schema.prisma` file is correct
2. Ensure all Prisma dependencies are installed
3. Check for syntax errors in schema file
4. Rebuild Docker image with `--no-cache` flag

### Issue: "Health check failing"

**Cause**: Application not starting properly or database connection issues

**Solution**:
1. Check application logs for startup errors
2. Verify all environment variables are set correctly
3. Test database connection manually
4. Increase health check timeout in Dockerfile if needed

## Monitoring and Debugging

### Application Logs
```bash
# View application logs in Dokploy dashboard
# Or use CLI if available
dokploy logs your-app-name --follow
```

### Database Logs
```bash
# View PostgreSQL logs in Dokploy dashboard
dokploy logs your-postgres-service --follow
```

### Health Check Endpoint
Once deployed, monitor application health:
```
GET https://your-domain.com/api/health
```

### Manual Database Connection Test
If needed, connect to PostgreSQL manually:
```bash
# From within the application container
psql $DATABASE_URL -c "SELECT 1;"
```

## Performance Optimization

### Database Connection Pooling
The application uses Prisma's built-in connection pooling. Monitor connection usage:
- Default pool size: 20 connections
- Adjust `DATABASE_CONNECTION_LIMIT` if needed
- Monitor connection usage in logs

### Memory Usage
- Monitor application memory usage in Dokploy dashboard
- Adjust container memory limits if needed
- Consider Redis for caching if memory usage is high

### Startup Time
- First startup may take longer due to database migrations
- Subsequent startups should be faster
- Monitor startup time in application logs

## Security Considerations

### Database Security
- Use strong passwords for database users
- Don't expose PostgreSQL to external networks
- Regularly update PostgreSQL version
- Monitor database access logs

### Application Security
- Use HTTPS for all external access
- Set secure environment variables
- Regularly update dependencies
- Monitor security logs

### Network Security
- Use internal Docker networks for service communication
- Implement proper firewall rules
- Monitor network traffic
- Use VPN for administrative access if needed

## Backup and Recovery

### Automated Backups
The application includes automated backup functionality:
- Database backups run daily at 2 AM (configurable)
- Backups are stored in configured storage bucket
- Retention period: 30 days (configurable)

### Manual Backup
```bash
# Create manual database backup
./scripts/backup-database.sh
```

### Disaster Recovery
```bash
# Restore from backup
./scripts/disaster-recovery.sh
```

## Support and Resources

### Dokploy Documentation
- [Official Docs](https://docs.dokploy.com)
- [GitHub Repository](https://github.com/Dokploy/dokploy)

### Application-Specific Help
- Check application logs first
- Review environment variable configuration
- Test database connectivity
- Monitor resource usage

### Getting Help
1. Check this troubleshooting guide
2. Review application and service logs
3. Test individual components (database, application)
4. Contact support with specific error messages and logs

This troubleshooting guide should help resolve most deployment issues with Dokploy. Keep it updated as you encounter and solve new issues.