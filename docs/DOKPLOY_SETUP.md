# Dokploy Setup Guide

This guide covers the complete setup and configuration of Dokploy for hosting the Fund Track App.

## What is Dokploy?

Dokploy is a modern deployment platform that simplifies Docker-based application deployments with:
- Web-based dashboard for management
- Git integration for automated deployments
- Built-in SSL certificate management
- Integrated monitoring and logging
- Zero-downtime deployments
- Multi-service orchestration

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ available disk space
- Root or sudo access
- Domain name pointing to your server
- Open ports: 80, 443, 3000 (Dokploy dashboard)

## Server Preparation

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Required Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for CLI tools)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y
```

### 3. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and Dokploy dashboard
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable
```

## Dokploy Installation

### 1. Download and Install Dokploy

```bash
# Download Dokploy installer
curl -sSL https://dokploy.com/install.sh | sh

# Or manual installation
git clone https://github.com/Dokploy/dokploy.git
cd dokploy
chmod +x install.sh
./install.sh
```

### 2. Start Dokploy Services

```bash
# Start Dokploy
sudo systemctl start dokploy
sudo systemctl enable dokploy

# Verify installation
sudo systemctl status dokploy
```

### 3. Access Dokploy Dashboard

1. Open your browser and navigate to: `http://your-server-ip:3000`
2. Complete the initial setup wizard
3. Create your admin account
4. Configure basic settings

## Initial Configuration

### 1. Admin Account Setup

1. **Create Admin User:**
   - Username: Choose a secure username
   - Email: admin@merchantfunding.com
   - Password: Use a strong password
   - Enable 2FA (recommended)

2. **Configure Organization:**
   - Organization name: Merchant Funding
   - Default timezone: Your timezone
   - Default region: Your server region

### 2. Domain Configuration

1. **Primary Domain Setup:**
   - Navigate to Settings → Domains
   - Add your primary domain: `dokploy.merchantfunding.com`
   - Configure DNS A record to point to your server IP
   - Enable SSL certificate generation

2. **SSL Certificate:**
   - Dokploy will automatically generate Let's Encrypt certificates
   - Certificates auto-renew every 90 days
   - Monitor certificate status in dashboard

### 3. Git Integration

1. **GitHub Integration:**
   - Go to Settings → Git Providers
   - Add GitHub provider
   - Generate and add GitHub personal access token
   - Configure webhook endpoints

2. **Repository Access:**
   - Ensure Dokploy can access your repositories
   - Set up deploy keys if using private repositories
   - Test connection to your Fund Track App repository

## Database Configuration

### 1. PostgreSQL Service Setup

1. **Create PostgreSQL Service:**
   - Navigate to Services → Create Service
   - Select PostgreSQL from templates
   - Configure service settings:
     - Service name: `postgres-prod`
     - Database name: `fund_track_app`
     - Username: `postgres`
     - Password: Generate secure password
     - Version: PostgreSQL 15

2. **Database Configuration:**
   - Memory limit: 1GB (adjust based on server resources)
   - Storage: 10GB (adjust based on data requirements)
   - Backup schedule: Daily at 2 AM
   - Backup retention: 30 days

3. **Network Configuration:**
   - Internal network: Enable
   - External access: Disable (for security)
   - Port: 5432 (internal only)

### 2. Redis Service (Optional)

1. **Create Redis Service:**
   - Navigate to Services → Create Service
   - Select Redis from templates
   - Configure service settings:
     - Service name: `redis-cache`
     - Memory limit: 512MB
     - Persistence: Enable
     - Password: Generate secure password

## Application Setup

### 1. Create Application

1. **New Application:**
   - Navigate to Applications → Create Application
   - Application name: `fund-track-app`
   - Deployment type: Docker
   - Git repository: Your Fund Track App repository
   - Branch: `main`

2. **Build Configuration:**
   - Build context: `/`
   - Dockerfile path: `./Dockerfile`
   - Build arguments: (if needed)
   - Auto-deploy on push: Enable

**Important Note**: The Dockerfile has been updated to handle database connection issues during build. It uses a placeholder DATABASE_URL during build time and sets up the database connection when the container starts. See `docs/DOKPLOY_TROUBLESHOOTING.md` for details.

### 2. Environment Variables

Configure all required environment variables in the application settings:

```bash
# Core Application
NODE_ENV=production
NEXTAUTH_URL=https://processing.merchantfunding.com
NEXTAUTH_SECRET=your-nextauth-secret

# Database (use internal service name)
DATABASE_URL=postgresql://postgres:password@postgres-prod:5432/fund_track_app

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

### 3. Domain and SSL

1. **Application Domain:**
   - Navigate to your application settings
   - Go to Domains tab
   - Add domain: `processing.merchantfunding.com`
   - Enable SSL certificate generation
   - Configure DNS A record

2. **SSL Configuration:**
   - Automatic Let's Encrypt certificate
   - HTTP to HTTPS redirect: Enable
   - HSTS headers: Enable
   - Certificate auto-renewal: Enable

## Security Configuration

### 1. Access Control

1. **User Management:**
   - Create additional users if needed
   - Assign appropriate roles and permissions
   - Enable 2FA for all users
   - Regular password rotation policy

2. **API Access:**
   - Generate API tokens for automation
   - Limit token permissions
   - Regular token rotation
   - Monitor API usage

### 2. Network Security

1. **Firewall Rules:**
   ```bash
   # Restrict Dokploy dashboard access (optional)
   sudo ufw delete allow 3000
   sudo ufw allow from your-office-ip to any port 3000
   ```

2. **Internal Networks:**
   - Use internal Docker networks for service communication
   - Disable external access to databases
   - Implement network segmentation

### 3. Backup Security

1. **Backup Encryption:**
   - Enable encryption for database backups
   - Secure backup storage location
   - Regular backup integrity checks

2. **Access Logs:**
   - Monitor access logs regularly
   - Set up alerts for suspicious activity
   - Implement log retention policies

## Monitoring and Alerting

### 1. System Monitoring

1. **Resource Monitoring:**
   - CPU usage alerts (> 80%)
   - Memory usage alerts (> 90%)
   - Disk space alerts (> 85%)
   - Network usage monitoring

2. **Service Health:**
   - Application health checks
   - Database connectivity monitoring
   - SSL certificate expiration alerts
   - Backup success/failure notifications

### 2. Notification Setup

1. **Email Notifications:**
   - Configure SMTP settings
   - Set up alert recipients
   - Test notification delivery

2. **Webhook Integration:**
   - Slack/Discord notifications
   - Custom webhook endpoints
   - Integration with monitoring tools

## Maintenance and Updates

### 1. Dokploy Updates

1. **Update Process:**
   ```bash
   # Check for updates
   dokploy version --check
   
   # Update Dokploy
   curl -sSL https://dokploy.com/update.sh | sh
   
   # Restart services
   sudo systemctl restart dokploy
   ```

2. **Backup Before Updates:**
   - Export application configurations
   - Backup database
   - Document current versions

### 2. System Maintenance

1. **Regular Tasks:**
   ```bash
   # System updates
   sudo apt update && sudo apt upgrade -y
   
   # Docker cleanup
   docker system prune -f
   
   # Log rotation
   sudo logrotate -f /etc/logrotate.conf
   ```

2. **Performance Optimization:**
   - Monitor resource usage trends
   - Optimize Docker images
   - Database performance tuning
   - Log management and cleanup

## Troubleshooting

### 1. Common Issues

1. **Dokploy Won't Start:**
   ```bash
   # Check service status
   sudo systemctl status dokploy
   
   # Check logs
   sudo journalctl -u dokploy -f
   
   # Restart service
   sudo systemctl restart dokploy
   ```

2. **SSL Certificate Issues:**
   - Verify DNS records
   - Check domain accessibility
   - Review certificate logs
   - Manually regenerate certificates

3. **Database Connection Issues:**
   - Verify service status
   - Check network connectivity
   - Review database logs
   - Test connection strings

### 2. Log Analysis

1. **Dokploy Logs:**
   ```bash
   # System logs
   sudo journalctl -u dokploy -f
   
   # Application logs
   dokploy logs fund-track-app --follow
   
   # Service logs
   dokploy logs postgres-prod --follow
   ```

2. **Docker Logs:**
   ```bash
   # Container logs
   docker logs dokploy-container-name
   
   # System events
   docker events --filter container=dokploy
   ```

## CLI Tools Installation

### 1. Dokploy CLI

```bash
# Install Dokploy CLI
npm install -g @dokploy/cli

# Login to your instance
dokploy login --url https://dokploy.merchantfunding.com

# Verify installation
dokploy --version
```

### 2. Common CLI Commands

```bash
# List applications
dokploy apps list

# Deploy application
dokploy deploy fund-track-app

# View logs
dokploy logs fund-track-app --follow

# Scale application
dokploy scale fund-track-app --replicas 2

# Restart application
dokploy restart fund-track-app
```

## Best Practices

### 1. Security Best Practices

- Use strong passwords and enable 2FA
- Regularly update system and Dokploy
- Monitor access logs and set up alerts
- Implement proper backup and recovery procedures
- Use internal networks for service communication
- Regularly review and rotate API tokens

### 2. Performance Best Practices

- Monitor resource usage and set appropriate limits
- Implement proper caching strategies
- Optimize Docker images for size and performance
- Use health checks for all services
- Implement proper logging and monitoring
- Regular database maintenance and optimization

### 3. Operational Best Practices

- Document all configurations and procedures
- Test backup and recovery procedures regularly
- Implement proper change management
- Use version control for configuration files
- Set up proper monitoring and alerting
- Regular security audits and updates

## Support and Resources

### 1. Documentation

- **Dokploy Official Docs:** https://docs.dokploy.com
- **Docker Documentation:** https://docs.docker.com
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

### 2. Community Support

- **Dokploy GitHub:** https://github.com/Dokploy/dokploy
- **Discord Community:** [Dokploy Discord Server]
- **Stack Overflow:** Tag questions with `dokploy`

### 3. Professional Support

- **Dokploy Pro Support:** Available for enterprise customers
- **Consulting Services:** Available for complex deployments
- **Training Programs:** Available for teams

This completes the Dokploy setup guide. Follow these steps to have a fully functional Dokploy instance ready to deploy your Fund Track App.

## Troubleshooting

If you encounter issues during deployment, especially database connection problems during the build process, refer to the comprehensive troubleshooting guide:

**📖 [Dokploy Troubleshooting Guide](./DOKPLOY_TROUBLESHOOTING.md)**

Common issues covered:
- Database connection errors during build
- Migration failures
- Health check issues
- Performance optimization
- Security considerations