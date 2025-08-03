# Manual Deployment Guide - Debian

This guide covers manual deployment of the Fund Track App on Debian servers for both test and production environments.

## Overview

This manual deployment approach provides full control over the deployment process and is ideal for:
- Organizations requiring custom deployment workflows
- Environments with specific security requirements
- Situations where automated deployment tools are not suitable
- Development and testing scenarios

## Prerequisites

### System Requirements

**Test Environment:**
- Debian 11+ (Bullseye or newer)
- Minimum 2GB RAM, 2 CPU cores
- 10GB+ available disk space
- Root or sudo access

**Production Environment:**
- Debian 11+ (Bullseye or newer)
- Minimum 4GB RAM, 4 CPU cores
- 50GB+ available disk space
- Root or sudo access
- SSL certificate for domain

### Required Software

- Node.js 18+ LTS
- PostgreSQL 15+
- Nginx
- PM2 (Process Manager)
- Git
- SSL certificates (Let's Encrypt recommended)

## Server Preparation

### 1. System Update

```bash
# Update package lists and system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
```

### 2. Install Node.js

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 4. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

### 5. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 6. Configure Firewall

```bash
# Install and configure UFW
sudo apt install -y ufw

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verify firewall status
sudo ufw status
```

## Database Setup

### Test Environment Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create test database and user
CREATE DATABASE fund_track_test;
CREATE USER fund_track_test_user WITH ENCRYPTED PASSWORD 'test_secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE fund_track_test TO fund_track_test_user;
ALTER USER fund_track_test_user CREATEDB;
\q
```

### Production Environment Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create production database and user
CREATE DATABASE fund_track_prod;
CREATE USER fund_track_prod_user WITH ENCRYPTED PASSWORD 'prod_very_secure_password_456';
GRANT ALL PRIVILEGES ON DATABASE fund_track_prod TO fund_track_prod_user;
\q

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf
```

**PostgreSQL Production Configuration:**
```conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
listen_addresses = 'localhost'

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Application Deployment

### 1. Create Application User

```bash
# Create dedicated user for the application
sudo adduser --system --group --home /opt/fund-track fund-track

# Create application directories with versioned deployment structure
sudo mkdir -p /opt/fund-track/{test,prod/releases,prod/shared,prod/backups}
sudo chown -R fund-track:fund-track /opt/fund-track
```

### 2. Clone Repository

```bash
# Switch to application user
sudo -u fund-track bash

# Clone repository for test environment
cd /opt/fund-track/test
git clone https://github.com/your-org/fund-track-app.git .

# For production, we'll use versioned deployments (initial setup)
cd /opt/fund-track/prod
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "releases/$TIMESTAMP"
cd "releases/$TIMESTAMP"
git clone https://github.com/your-org/fund-track-app.git .
```

### 3. Test Environment Setup

```bash
# Switch to test directory
cd /opt/fund-track/test

# Install dependencies
npm ci

# Create environment file
cp .env.example .env.test
```

**Test Environment Variables (.env.test):**
```bash
# Core Application
NODE_ENV=test
PORT=3001
NEXTAUTH_URL=http://test.merchantfunding.com
NEXTAUTH_SECRET=test_nextauth_secret_change_in_production

# Database
DATABASE_URL=postgresql://fund_track_test_user:test_secure_password_123@localhost:5432/fund_track_test

# External Services (Test/Sandbox)
TWILIO_ACCOUNT_SID=test_twilio_sid
TWILIO_AUTH_TOKEN=test_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
MAILGUN_API_KEY=test_mailgun_key
MAILGUN_DOMAIN=sandbox.mailgun.org
MAILGUN_FROM_EMAIL=test@merchantfunding.com

# File Storage (Test Bucket)
B2_APPLICATION_KEY_ID=test_b2_key_id
B2_APPLICATION_KEY=test_b2_key
B2_BUCKET_NAME=fund-track-test
B2_BUCKET_ID=test_bucket_id

# Legacy Database (Test)
LEGACY_DB_SERVER=test-legacy-db.internal
LEGACY_DB_PORT=1433
LEGACY_DB_USER=test_legacy_user
LEGACY_DB_PASSWORD=test_legacy_password
LEGACY_DB_DATABASE=test_legacy_db

# Application Settings
ENABLE_BACKGROUND_JOBS=false
LOG_LEVEL=debug
FORCE_HTTPS=false
SECURE_COOKIES=false
ENABLE_RATE_LIMITING=false
```

```bash
# Build application
npm run build

# Run database migrations
npm run db:migrate

# Seed test data (optional)
npm run db:seed
```

### 4. Production Environment Setup

```bash
# Switch to production directory (current release)
cd /opt/fund-track/prod/releases/$(ls -t /opt/fund-track/prod/releases | head -1)

# Install dependencies
npm ci --only=production

# Create shared environment file
mkdir -p /opt/fund-track/prod/shared
cp .env.example /opt/fund-track/prod/shared/.env.production
```

**Production Environment Variables (/opt/fund-track/prod/shared/.env.production):**
```bash
# Core Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://processing.merchantfunding.com
NEXTAUTH_SECRET=production_nextauth_secret_very_secure_random_string

# Database
DATABASE_URL=postgresql://fund_track_prod_user:prod_very_secure_password_456@localhost:5432/fund_track_prod

# External Services (Production)
TWILIO_ACCOUNT_SID=prod_twilio_sid
TWILIO_AUTH_TOKEN=prod_twilio_token
TWILIO_PHONE_NUMBER=+1987654321
MAILGUN_API_KEY=prod_mailgun_key
MAILGUN_DOMAIN=merchantfunding.com
MAILGUN_FROM_EMAIL=noreply@merchantfunding.com

# File Storage (Production Bucket)
B2_APPLICATION_KEY_ID=prod_b2_key_id
B2_APPLICATION_KEY=prod_b2_key
B2_BUCKET_NAME=fund-track-production
B2_BUCKET_ID=prod_bucket_id

# Legacy Database (Production)
LEGACY_DB_SERVER=legacy-db.internal
LEGACY_DB_PORT=1433
LEGACY_DB_USER=prod_legacy_user
LEGACY_DB_PASSWORD=prod_legacy_password
LEGACY_DB_DATABASE=prod_legacy_db

# Application Settings
ENABLE_BACKGROUND_JOBS=true
LOG_LEVEL=info
FORCE_HTTPS=true
SECURE_COOKIES=true
ENABLE_RATE_LIMITING=true
ENABLE_AUTOMATED_BACKUPS=true
```

```bash
# Link shared environment file
ln -sf /opt/fund-track/prod/shared/.env.production .env.production

# Build application
npm run build

# Run database migrations
npm run db:migrate

# Create current symlink for initial deployment
cd /opt/fund-track/prod
ln -sf "releases/$(ls -t releases | head -1)" current
```

## Process Management with PM2

### 1. PM2 Configuration

Create PM2 ecosystem file:

```bash
# Create PM2 configuration
sudo -u fund-track nano /opt/fund-track/ecosystem.config.js
```

**PM2 Ecosystem Configuration:**
```javascript
module.exports = {
  apps: [
    {
      name: 'fund-track-test',
      cwd: '/opt/fund-track/test',
      script: 'npm',
      args: 'start',
      env_file: '.env.test',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/fund-track/test-error.log',
      out_file: '/var/log/fund-track/test-out.log',
      log_file: '/var/log/fund-track/test-combined.log',
      time: true,
      env: {
        NODE_ENV: 'test',
        PORT: 3001
      }
    },
    {
      name: 'fund-track-prod',
      cwd: '/opt/fund-track/prod/current',
      script: 'npm',
      args: 'start',
      env_file: '.env.production',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/fund-track/prod-error.log',
      out_file: '/var/log/fund-track/prod-out.log',
      log_file: '/var/log/fund-track/prod-combined.log',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### 2. Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/fund-track
sudo chown -R fund-track:fund-track /var/log/fund-track
```

### 3. Start Applications

```bash
# Switch to application user
sudo -u fund-track bash

# Start applications using PM2
cd /opt/fund-track
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
# Follow the instructions provided by PM2 to run the generated command as root
```

## Nginx Configuration

### 1. Test Environment Nginx Config

```bash
# Create test site configuration
sudo nano /etc/nginx/sites-available/fund-track-test
```

**Test Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name test.merchantfunding.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/fund-track-test-access.log;
    error_log /var/log/nginx/fund-track-test-error.log;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Production Environment Nginx Config

```bash
# Create production site configuration
sudo nano /etc/nginx/sites-available/fund-track-prod
```

**Production Nginx Configuration:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name processing.merchantfunding.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name processing.merchantfunding.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/processing.merchantfunding.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/processing.merchantfunding.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/fund-track-prod-access.log;
    error_log /var/log/nginx/fund-track-prod-error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login endpoint rate limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security.txt
    location /.well-known/security.txt {
        return 200 "Contact: security@merchantfunding.com\nExpires: 2025-12-31T23:59:59.000Z\n";
        add_header Content-Type text/plain;
    }
}
```

### 3. Enable Sites

```bash
# Enable test site
sudo ln -s /etc/nginx/sites-available/fund-track-test /etc/nginx/sites-enabled/

# Enable production site
sudo ln -s /etc/nginx/sites-available/fund-track-prod /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup (Production)

### 1. Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d processing.merchantfunding.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 2. Auto-renewal Setup

```bash
# Create renewal script
sudo nano /etc/cron.d/certbot-renewal
```

**Certbot Renewal Cron:**
```bash
# Renew certificates twice daily
0 */12 * * * root certbot renew --quiet && systemctl reload nginx
```

## Deployment Scripts

### 1. Test Deployment Script

```bash
# Create test deployment script
sudo nano /opt/fund-track/deploy-test.sh
```

**Test Deployment Script:**
```bash
#!/bin/bash

set -e

echo "Starting test deployment..."

# Change to test directory
cd /opt/fund-track/test

# Pull latest changes
git pull origin develop

# Install/update dependencies
npm ci

# Run tests
npm run test

# Build application
npm run build

# Run database migrations
npm run db:migrate

# Restart application
pm2 restart fund-track-test

# Wait for application to start
sleep 10

# Health check
if curl -f http://localhost:3001/api/health; then
    echo "Test deployment successful!"
else
    echo "Test deployment failed - health check failed"
    exit 1
fi
```

### 2. Production Deployment Script

```bash
# Create production deployment script
sudo nano /opt/fund-track/deploy-prod.sh
```

**Production Deployment Script:**
```bash
#!/bin/bash

set -e

echo "Starting production deployment..."

DEPLOY_TO="/opt/fund-track/prod"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="$DEPLOY_TO/releases/$TIMESTAMP"
CURRENT_DIR="$DEPLOY_TO/current"

# Create backup
echo "Creating backup..."
pg_dump -h localhost -U fund_track_prod_user fund_track_prod > "$DEPLOY_TO/backups/db-$TIMESTAMP.sql"

# Create new release directory
echo "Creating new release: $TIMESTAMP"
mkdir -p "$RELEASE_DIR"
cd "$RELEASE_DIR"

# Clone latest code
git clone https://github.com/your-org/fund-track-app.git .
git checkout main

# Install dependencies
npm ci --only=production

# Link shared files
ln -sf "$DEPLOY_TO/shared/.env.production" "$RELEASE_DIR/.env.production"

# Create shared directories if they don't exist
mkdir -p "$DEPLOY_TO/shared/uploads"
ln -sf "$DEPLOY_TO/shared/uploads" "$RELEASE_DIR/public/uploads"

# Run tests
npm run test

# Build application
npm run build

# Run database migrations
npm run db:migrate

# Atomic switch to new version
echo "Switching to new version..."
ln -sfn "$RELEASE_DIR" "$CURRENT_DIR"

# Restart application with zero downtime
pm2 reload fund-track-prod

# Wait for application to start
sleep 15

# Health check
if curl -f https://processing.merchantfunding.com/api/health; then
    echo "Production deployment successful!"
    echo "Deployed version: $TIMESTAMP"
    
    # Keep only last 5 releases
    cd "$DEPLOY_TO/releases"
    ls -t | tail -n +6 | xargs -r rm -rf
    
    # Clean old database backups (keep last 10)
    cd "$DEPLOY_TO/backups"
    ls -t db-*.sql | tail -n +11 | xargs -r rm
else
    echo "Production deployment failed - health check failed"
    echo "Rolling back to previous version..."
    
    # Get previous version
    PREVIOUS_VERSION=$(ls -t "$DEPLOY_TO/releases" | sed -n '2p')
    if [ -n "$PREVIOUS_VERSION" ] && [ "$PREVIOUS_VERSION" != "$TIMESTAMP" ]; then
        ln -sfn "$DEPLOY_TO/releases/$PREVIOUS_VERSION" "$CURRENT_DIR"
        pm2 reload fund-track-prod
        echo "Rolled back to version: $PREVIOUS_VERSION"
    fi
    
    # Remove failed release
    rm -rf "$RELEASE_DIR"
    exit 1
fi
```

### 3. Rollback Script

```bash
# Create rollback script
sudo nano /opt/fund-track/rollback.sh
```

**Rollback Script:**
```bash
#!/bin/bash

set -e

DEPLOY_TO="/opt/fund-track/prod"
VERSION=${1:-$(ls -t "$DEPLOY_TO/releases" | sed -n '2p')}  # Default to previous version

if [ -z "$VERSION" ]; then
    echo "No previous version found!"
    exit 1
fi

if [ ! -d "$DEPLOY_TO/releases/$VERSION" ]; then
    echo "Version $VERSION not found!"
    echo "Available versions:"
    ls -la "$DEPLOY_TO/releases/"
    exit 1
fi

echo "Rolling back to version: $VERSION"

# Atomic switch back
ln -sfn "$DEPLOY_TO/releases/$VERSION" "$DEPLOY_TO/current"

# Restart application
pm2 reload fund-track-prod

# Wait for application to start
sleep 10

# Health check
if curl -f https://processing.merchantfunding.com/api/health; then
    echo "Rollback to version $VERSION successful!"
else
    echo "Rollback failed - health check failed"
    exit 1
fi
```

### 4. Version Management Script

```bash
# Create version management script
sudo nano /opt/fund-track/versions.sh
```

**Version Management Script:**
```bash
#!/bin/bash

DEPLOY_TO="/opt/fund-track/prod"

case "$1" in
    list)
        echo "Available versions:"
        ls -la "$DEPLOY_TO/releases/" | grep "^d" | awk '{print $9, $6, $7, $8}' | grep -v "^\.$\|^\.\.$"
        echo
        echo "Current version:"
        readlink "$DEPLOY_TO/current" | sed 's|.*/||'
        ;;
    current)
        echo "Current version:"
        readlink "$DEPLOY_TO/current" | sed 's|.*/||'
        ;;
    cleanup)
        echo "Cleaning up old versions (keeping last 5)..."
        cd "$DEPLOY_TO/releases"
        ls -t | tail -n +6 | xargs -r rm -rf
        echo "Cleanup complete"
        ;;
    *)
        echo "Usage: $0 {list|current|cleanup}"
        echo "  list    - Show all available versions"
        echo "  current - Show current active version"
        echo "  cleanup - Remove old versions (keep last 5)"
        exit 1
        ;;
esac
```

### 5. Make Scripts Executable

```bash
# Make scripts executable
sudo chmod +x /opt/fund-track/deploy-test.sh
sudo chmod +x /opt/fund-track/deploy-prod.sh
sudo chmod +x /opt/fund-track/rollback.sh
sudo chmod +x /opt/fund-track/versions.sh

# Ensure backup directories exist
sudo mkdir -p /opt/fund-track/backups
sudo mkdir -p /opt/fund-track/prod/shared
sudo chown -R fund-track:fund-track /opt/fund-track
```

## Monitoring and Logging

### 1. Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/fund-track
```

**Logrotate Configuration:**
```bash
/var/log/fund-track/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 fund-track fund-track
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/fund-track-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### 2. System Monitoring Script

```bash
# Create monitoring script
sudo nano /opt/fund-track/monitor.sh
```

**Monitoring Script:**
```bash
#!/bin/bash

# Check application health
check_app_health() {
    local env=$1
    local port=$2
    local url="http://localhost:$port/api/health"
    
    if curl -f -s "$url" > /dev/null; then
        echo "✓ $env environment is healthy"
    else
        echo "✗ $env environment is unhealthy"
        # Send alert (implement your alerting mechanism)
    fi
}

# Check database connectivity
check_database() {
    local env=$1
    local db_name=$2
    
    if sudo -u postgres psql -d "$db_name" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✓ $env database is accessible"
    else
        echo "✗ $env database is not accessible"
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 85 ]; then
        echo "✗ Disk usage is high: ${usage}%"
    else
        echo "✓ Disk usage is normal: ${usage}%"
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$usage" -gt 90 ]; then
        echo "✗ Memory usage is high: ${usage}%"
    else
        echo "✓ Memory usage is normal: ${usage}%"
    fi
}

echo "=== Fund Track App Health Check ==="
echo "Timestamp: $(date)"
echo

check_app_health "Test" 3001
check_app_health "Production" 3000
check_database "Test" "fund_track_test"
check_database "Production" "fund_track_prod"
check_disk_space
check_memory

echo
echo "=== PM2 Status ==="
pm2 status
```

```bash
# Make monitoring script executable
sudo chmod +x /opt/fund-track/monitor.sh

# Add to crontab for regular checks
sudo crontab -e
# Add this line to run every 5 minutes:
# */5 * * * * /opt/fund-track/monitor.sh >> /var/log/fund-track/monitor.log 2>&1
```

## Backup and Recovery

### 1. Database Backup Script

```bash
# Create backup script
sudo nano /opt/fund-track/backup.sh
```

**Backup Script:**
```bash
#!/bin/bash

set -e

BACKUP_DIR="/opt/fund-track/backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup test database
echo "Backing up test database..."
pg_dump -h localhost -U fund_track_test_user fund_track_test > "$BACKUP_DIR/test-backup-$DATE.sql"

# Backup production database
echo "Backing up production database..."
pg_dump -h localhost -U fund_track_prod_user fund_track_prod > "$BACKUP_DIR/prod-backup-$DATE.sql"

# Compress backups
gzip "$BACKUP_DIR/test-backup-$DATE.sql"
gzip "$BACKUP_DIR/prod-backup-$DATE.sql"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed successfully"
```

```bash
# Make backup script executable
sudo chmod +x /opt/fund-track/backup.sh

# Add to crontab for daily backups
sudo crontab -e
# Add this line for daily backups at 2 AM:
# 0 2 * * * /opt/fund-track/backup.sh >> /var/log/fund-track/backup.log 2>&1
```

### 2. Recovery Procedures

**Test Environment Recovery:**
```bash
# Stop application
pm2 stop fund-track-test

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE fund_track_test;"
sudo -u postgres psql -c "CREATE DATABASE fund_track_test;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fund_track_test TO fund_track_test_user;"

# Restore from backup
gunzip -c /opt/fund-track/backups/test-backup-YYYYMMDD-HHMMSS.sql.gz | sudo -u postgres psql fund_track_test

# Start application
pm2 start fund-track-test
```

**Production Environment Recovery:**
```bash
# Stop application
pm2 stop fund-track-prod

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE fund_track_prod;"
sudo -u postgres psql -c "CREATE DATABASE fund_track_prod;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fund_track_prod TO fund_track_prod_user;"

# Restore from backup (use timestamped backup)
gunzip -c /opt/fund-track/prod/backups/db-YYYYMMDD-HHMMSS.sql.gz | sudo -u postgres psql fund_track_prod

# Start application
pm2 start fund-track-prod
```

## Security Hardening

### 1. System Security

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Configure fail2ban for SSH
sudo nano /etc/fail2ban/jail.local
```

**Fail2ban Configuration:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
```

```bash
# Start and enable fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 2. Application Security

```bash
# Set proper file permissions
sudo chown -R fund-track:fund-track /opt/fund-track
sudo chmod -R 750 /opt/fund-track
sudo chmod 640 /opt/fund-track/*/.*env*

# Secure log files
sudo chown -R fund-track:fund-track /var/log/fund-track
sudo chmod -R 640 /var/log/fund-track
```

### 3. Database Security

```bash
# Configure PostgreSQL security
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

**PostgreSQL Security Configuration:**
```conf
# Only allow local connections
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Troubleshooting

### 1. Common Issues

**Application Won't Start:**
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs fund-track-test
pm2 logs fund-track-prod

# Check system resources
free -h
df -h
```

**Database Connection Issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -d fund_track_test -c "SELECT 1;"
sudo -u postgres psql -d fund_track_prod -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**Nginx Issues:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/fund-track-*-error.log
```

### 2. Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor application performance
pm2 monit

# Check database performance
sudo -u postgres psql -d fund_track_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# System updates (monthly)
sudo apt update && sudo apt upgrade -y

# Node.js updates (as needed)
# Check current version: node --version
# Update using NodeSource repository

# Application updates
# Use deployment scripts: ./deploy-test.sh and ./deploy-prod.sh
```

### 2. Log Management

```bash
# Check log sizes
du -sh /var/log/fund-track/*
du -sh /var/log/nginx/fund-track-*

# Manual log rotation if needed
sudo logrotate -f /etc/logrotate.d/fund-track

# Clean PM2 logs
pm2 flush
```

### 3. Database Maintenance

```bash
# Analyze database performance
sudo -u postgres psql -d fund_track_prod -c "ANALYZE;"

# Vacuum database
sudo -u postgres psql -d fund_track_prod -c "VACUUM ANALYZE;"

# Check database size
sudo -u postgres psql -d fund_track_prod -c "
SELECT pg_size_pretty(pg_database_size('fund_track_prod'));"
```

## Deployment and Rollback Procedures

### Quick Commands

```bash
# Deploy new version
./deploy-prod.sh

# Rollback to previous version
./rollback.sh

# Rollback to specific version
./rollback.sh 20250203-143022

# List available versions
./versions.sh list

# Show current version
./versions.sh current

# Clean up old versions
./versions.sh cleanup
```

### Deployment Checklist

### Test Environment Deployment

- [ ] Pull latest code from develop branch
- [ ] Install/update dependencies
- [ ] Run tests
- [ ] Build application
- [ ] Run database migrations
- [ ] Restart application
- [ ] Verify health check
- [ ] Test key functionality

### Production Environment Deployment

- [ ] Create database backup with timestamp
- [ ] Create new versioned release directory
- [ ] Clone latest code from main branch
- [ ] Install/update dependencies (production only)
- [ ] Link shared configuration files
- [ ] Run tests
- [ ] Build application
- [ ] Run database migrations
- [ ] Atomic switch to new version (symlink)
- [ ] Restart application with zero downtime
- [ ] Verify health check
- [ ] Test key functionality
- [ ] Monitor for errors
- [ ] Clean old releases (keep last 5)
- [ ] Clean old backups (keep last 10)

### Rollback Checklist

- [ ] Identify target version for rollback
- [ ] Execute rollback script
- [ ] Verify health check passes
- [ ] Test key functionality
- [ ] Monitor application logs
- [ ] Consider database rollback if needed

## Support and Documentation

### 1. Log Locations

- Application logs: `/var/log/fund-track/`
- Nginx logs: `/var/log/nginx/fund-track-*`
- PostgreSQL logs: `/var/log/postgresql/`
- System logs: `/var/log/syslog`

### 2. Configuration Files

- PM2 config: `/opt/fund-track/ecosystem.config.js`
- Nginx configs: `/etc/nginx/sites-available/fund-track-*`
- Test environment file: `/opt/fund-track/test/.env.test`
- Production environment file: `/opt/fund-track/prod/shared/.env.production`
- PostgreSQL config: `/etc/postgresql/15/main/postgresql.conf`

### 3. Useful Commands

```bash
# Deployment and rollback
./deploy-prod.sh                    # Deploy new version
./rollback.sh                       # Rollback to previous version
./rollback.sh 20250203-143022      # Rollback to specific version
./versions.sh list                  # List all versions
./versions.sh current               # Show current version

# PM2 management
pm2 status
pm2 restart fund-track-prod
pm2 logs fund-track-prod --lines 100
pm2 monit

# System monitoring
systemctl status nginx
systemctl status postgresql
df -h
free -h
htop

# Database management
sudo -u postgres psql -d fund_track_prod
pg_dump -h localhost -U fund_track_prod_user fund_track_prod > backup.sql

# Nginx management
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/fund-track-prod-access.log

# Version management
ls -la /opt/fund-track/prod/releases/     # List all releases
readlink /opt/fund-track/prod/current     # Show current symlink target
```

This manual deployment guide provides a comprehensive approach to deploying the Fund Track App on Debian servers with separate test and production environments. The production environment uses versioned deployments with symlinks for instant rollbacks and zero-downtime deployments. Follow the procedures carefully and maintain regular backups and monitoring.