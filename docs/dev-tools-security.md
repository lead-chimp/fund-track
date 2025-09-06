# Development Tools Security

## Overview

The `/dev` routes in Fund Track contain powerful development and testing tools that can modify production data. These routes are protected by a multi-layered security approach.

## Security Model

### 1. Role-Based Access Control

- **SYSTEM_ADMIN Role Required**: Only users with the `SYSTEM_ADMIN` role can access dev tools
- **Separate from Regular Admin**: `ADMIN` users cannot access dev tools, only `SYSTEM_ADMIN` can
- **Principle of Least Privilege**: Dev access is granted only to those who absolutely need it

### 2. Authentication Requirements

- **Session Required**: All dev routes require valid authentication
- **Role Verification**: Both middleware and page-level checks verify `SYSTEM_ADMIN` role
- **Automatic Redirect**: Unauthorized users are redirected to appropriate pages

### 3. Production Access

- **Always Available**: Dev tools are available in all environments (development, staging, production)
- **Role-Based Only**: Access is controlled solely by `SYSTEM_ADMIN` role, not environment
- **Consistent Security**: Same security model across all environments

## User Role Hierarchy

```
SYSTEM_ADMIN  → Full access (dev tools + admin features + user features)
ADMIN         → Admin features + user features (NO dev tools)
USER          → User features only
```

## Available Dev Tools

### `/dev/test-legacy-db`
- Insert/delete test records in MS SQL Server
- Trigger lead polling operations
- View legacy and app database records
- **Risk Level**: HIGH - Can modify production legacy data

### `/dev/test-notifications`
- Send test emails and SMS messages
- Test notification templates
- **Risk Level**: MEDIUM - Can send real notifications

### `/dev/reset-intake`
- Reset intake processes for testing
- Clear intake tokens and status
- **Risk Level**: MEDIUM - Can affect user workflows

## API Endpoints

All `/api/dev/*` endpoints follow the same security model:
- `SYSTEM_ADMIN` role required
- Environment-based protection
- Rate limiting applied

## User Management

### Promoting Users to System Admin

```bash
# List all users and their roles
npm run users:list

# Promote a user to SYSTEM_ADMIN
npm run users:promote user@example.com
```

### Creating System Admin Users

1. Create user normally through the application
2. Use the promotion script to upgrade to `SYSTEM_ADMIN`
3. Verify access to dev tools

## Security Best Practices

### For System Administrators

1. **Limit System Admin Users**: Only promote users who absolutely need dev access
2. **Regular Audits**: Periodically review who has `SYSTEM_ADMIN` access
3. **Environment Awareness**: Always verify which environment you're working in
4. **Data Backup**: Ensure backups before using destructive dev tools

### For Deployment

1. **Role Management**: Carefully control who has `SYSTEM_ADMIN` access
2. **Monitoring**: Monitor access to dev routes in all environments
3. **Audit Logs**: Track all dev tool usage and data modifications
4. **IP Restrictions**: Consider additional IP-based restrictions for extra security

## Emergency Procedures

### Revoking System Admin Access

```sql
-- Connect to database and run:
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';
```

### Disabling Dev Tools Access

```sql
-- Revoke SYSTEM_ADMIN access from all users
UPDATE users SET role = 'ADMIN' WHERE role = 'SYSTEM_ADMIN';
```

### Audit Trail

All dev tool usage should be logged. Check:
- Application logs for dev route access
- Database logs for data modifications
- Notification logs for test messages sent

## Implementation Details

### Middleware Protection (`src/middleware.ts`)
- Route matching for `/dev/*` and `/api/dev/*`
- Environment checks
- Role verification
- Automatic redirects

### Layout Protection (`src/app/dev/layout.tsx`)
- Server-side session verification
- Visual security warnings
- Navigation between dev tools

### Database Schema (`prisma/schema.prisma`)
- `SYSTEM_ADMIN` enum value in `UserRole`
- Migration: `20250906054914_add_system_admin_role`

## Monitoring and Alerts

Consider setting up alerts for:
- Any access to `/dev/*` routes in production
- Multiple failed authentication attempts on dev routes
- Unusual patterns in dev tool usage
- Changes to user roles (especially `SYSTEM_ADMIN` promotions)