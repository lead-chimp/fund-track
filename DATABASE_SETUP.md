# Database Setup Guide

This guide explains how to set up the PostgreSQL database and Prisma ORM for the Merchant Funding App.

## Prerequisites

- PostgreSQL server running locally or remotely
- Node.js and npm/yarn installed
- Environment variables configured

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the `DATABASE_URL` in `.env.local`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/merchant_funding_app"
   ```

## Database Setup Steps

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Generate Prisma Client

```bash
npm run db:generate
# or
yarn db:generate
```

### 3. Run Database Migration

```bash
npm run db:migrate
# or
yarn db:migrate
```

### 4. Seed the Database

```bash
npm run db:seed
# or
yarn db:seed
```

## Database Schema

The database includes the following tables:

### Users
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `role` - Either 'admin' or 'user'
- `created_at`, `updated_at` - Timestamps

### Leads
- `id` - Primary key
- `legacy_lead_id` - Unique ID from legacy system
- `campaign_id` - Campaign identifier
- Contact information (email, phone, name, business)
- `status` - Lead status (new, pending, in_progress, completed, rejected)
- `intake_token` - Unique token for intake workflow
- Timestamps

### Lead Notes
- Internal notes added by staff members
- Links to both lead and user (author)

### Documents
- File metadata for uploaded documents
- Links to Backblaze B2 storage
- Tracks who uploaded each document

### Followup Queue
- Manages automated follow-up scheduling
- Different follow-up types (3h, 9h, 24h, 72h)
- Status tracking (pending, sent, cancelled)

### Notification Log
- Tracks all email and SMS notifications
- Includes delivery status and error messages
- Links to external service IDs

## Sample Data

The seed script creates:

- **3 Users**: Admin, regular user, and sales user
- **6 Leads**: Various statuses and scenarios
- **4 Lead Notes**: Sample internal notes
- **4 Documents**: Mock document uploads
- **4 Follow-up Queue Entries**: Different follow-up scenarios
- **4 Notification Logs**: Email/SMS delivery tracking

### Test Credentials

- **Admin**: admin@merchantfunding.com / admin123
- **User**: user@merchantfunding.com / user123
- **Sales**: sales@merchantfunding.com / user123

## Useful Commands

```bash
# View database in browser
npm run db:studio

# Reset database (careful - deletes all data!)
npx prisma migrate reset

# Push schema changes without migration
npm run db:push

# Generate Prisma client after schema changes
npm run db:generate
```

## Database Relationships

```
Users (1) ←→ (N) LeadNotes
Users (1) ←→ (N) Documents (uploaded_by)

Leads (1) ←→ (N) LeadNotes
Leads (1) ←→ (N) Documents
Leads (1) ←→ (N) FollowupQueue
Leads (1) ←→ (N) NotificationLog
```

## Next Steps

After setting up the database:

1. Implement authentication system (Task 3)
2. Build lead management API endpoints (Task 4)
3. Create legacy database integration (Task 5)

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

### Migration Issues
- Check for existing migrations
- Verify schema syntax
- Reset database if needed

### Seed Issues
- Ensure migrations are applied first
- Check for unique constraint violations
- Verify bcrypt dependency is installed