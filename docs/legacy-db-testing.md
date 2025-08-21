# Legacy Database Testing Guide

This guide covers the testing tools for managing test records in the legacy MS SQL Server database and simulating real-world integration scenarios.

## Overview

The legacy database testing tools allow you to:
- Insert test records into the legacy database
- Delete test records from the legacy database
- Automatically cleanup related records in the app database
- Simulate real-world integration testing scenarios

## Default Test Record Values

```sql
-- INSERT
INSERT INTO [LeadData2].[dbo].[Leads]
([PostDT],[CampaignID],[SourceID],[PublisherID],[SubID],[FirstName],[LastName],[Email],[Phone],[Address],[City],[State],[ZipCode],[Country])
VALUES(
  GETDATE(),               -- PostDT: now
  11302,                   -- CampaignID
  6343,                    -- SourceID
  40235,                   -- PublisherID
  'TEST',                  -- SubID
  'TEST',                  -- FirstName
  'TEST',                  -- LastName
  'ARDABASOGLU@GMAIL.COM', -- Email
  '+905326666815',         -- Phone
  '1260 NW 133 AVE',       -- Address
  'Fort Lauderdale',       -- City
  'FL',                    -- State
  '33323',                 -- ZipCode
  'USA'                    -- Country
);

-- DELETE
DELETE FROM [LeadData2].[dbo].[Leads]
WHERE CampaignID = 11302
  AND SourceID = 6343
  AND PublisherID = 40235
  AND SubID = 'TEST'
  AND FirstName = 'TEST'
  AND LastName = 'TEST'
  AND Email = 'ARDABASOGLU@GMAIL.COM'
  AND Phone = '+905326666815'
  AND Address = '1260 NW 133 AVE'
  AND City = 'Fort Lauderdale'
  AND State = 'FL'
  AND ZipCode = '33323'
  AND Country = 'USA';
```

## Testing Methods

### 1. Web Interface (Recommended)

Navigate to `/dev/test-legacy-db` in your browser for the visual testing interface.

**Features:**
- Form-based editing of test record values
- Insert, delete, and cleanup operations
- Real-time display of existing records in both databases
- Automatic data refresh after operations
- Visual feedback for success/error states

**URL:** `http://localhost:3000/dev/test-legacy-db`

### 2. API Endpoint

Direct API access for programmatic testing.

**Endpoint:** `POST /api/dev/test-legacy-db`

**Insert Payload:**
```json
{
  "action": "insert",
  "customValues": {
    "CampaignID": 11302,
    "FirstName": "CUSTOM_TEST",
    "Email": "custom@test.com"
  }
}
```

**Delete Payload:**
```json
{
  "action": "delete",
  "customValues": {
    "CampaignID": 11302,
    "FirstName": "TEST",
    "Email": "ARDABASOGLU@GMAIL.COM"
  }
}
```

**Cleanup Payload:**
```json
{
  "action": "cleanup",
  "customValues": {
    "CampaignID": 11302,
    "FirstName": "TEST",
    "Email": "ARDABASOGLU@GMAIL.COM"
  }
}
```

**Status Check:**
```http
GET /api/dev/test-legacy-db
```

### 3. Command Line Script

Quick terminal-based operations.

**Usage:**
```bash
# Insert test record
node scripts/test-legacy-db.mjs insert

# Delete test records and cleanup
node scripts/test-legacy-db.mjs delete

# Cleanup app records only
node scripts/test-legacy-db.mjs cleanup

# Check current status
node scripts/test-legacy-db.mjs status
```

## Operations

### Insert Operation
- Creates a new test record in the legacy database
- Uses current timestamp for PostDT
- Returns the new LeadID from the legacy database
- The lead poller will eventually import this record into the app database

### Delete Operation
- Removes matching test records from the legacy database
- Automatically triggers cleanup of related records in the app database
- Deletes associated data: status history, follow-ups, documents, notification logs

### Cleanup Operation
- Only removes related records from the app database
- Does not touch the legacy database
- Useful when you want to test re-import scenarios

## Related Record Cleanup

When deleting or cleaning up, the following app database records are removed:
- **Leads** - Main lead records
- **Lead Status History** - All status change history
- **Follow-ups** - Scheduled follow-up tasks
- **Documents** - Uploaded files and metadata
- **Notification Logs** - Email/SMS notification history

## Environment Setup

Ensure these environment variables are configured for legacy database access:

```env
LEGACY_DB_SERVER=your-sql-server
LEGACY_DB_DATABASE=LeadData2
LEGACY_DB_USER=your-username
LEGACY_DB_PASSWORD=your-password
LEGACY_DB_PORT=1433
LEGACY_DB_ENCRYPT=false
LEGACY_DB_TRUST_CERT=true
```

## Integration Testing Scenarios

### Scenario 1: New Lead Import
1. Insert a test record using the web interface
2. Wait for the lead poller to run (or trigger manually)
3. Verify the lead appears in the app dashboard
4. Test the intake workflow with the generated token

### Scenario 2: Lead Deletion and Cleanup
1. Insert a test record and let it be imported
2. Complete some intake steps to create related data
3. Delete the record from legacy database
4. Verify all related app records are cleaned up

### Scenario 3: Re-import Testing
1. Insert a test record and let it be imported
2. Use cleanup operation to remove app records only
3. Trigger lead poller again to test re-import logic

### Scenario 4: Custom Test Data
1. Modify the form values in the web interface
2. Insert records with different campaign IDs, names, etc.
3. Test how the system handles various data scenarios

## Monitoring and Verification

### Web Interface Monitoring
- View existing records in both databases
- Real-time count of legacy vs app records
- Visual status indicators for lead progression

### Database Verification
```sql
-- Check legacy database
SELECT * FROM [LeadData2].[dbo].[Leads] 
WHERE CampaignID = 11302 AND SubID = 'TEST';

-- Check app database (via Prisma Studio or direct query)
SELECT * FROM Lead 
WHERE campaignId = 11302 AND firstName = 'TEST';
```

## Best Practices

1. **Use Unique Identifiers**: Modify SubID or email to create unique test records
2. **Clean Up After Testing**: Always delete test records when done
3. **Monitor Both Databases**: Verify operations in both legacy and app databases
4. **Test Edge Cases**: Try invalid data, missing fields, etc.
5. **Verify Cleanup**: Ensure all related records are properly removed

## Troubleshooting

### Common Issues
- **Connection Errors**: Check legacy database environment variables
- **Permission Errors**: Ensure database user has INSERT/DELETE permissions
- **Cleanup Failures**: Check for foreign key constraints or transaction issues

### Error Messages
- `Legacy database connection failed`: Check connection settings
- `Query execution failed`: Verify SQL syntax and permissions
- `Cleanup failed`: Check for data integrity constraints

## Security Notes

- These testing endpoints are only available in development
- Do not expose testing endpoints in production
- Use test databases when possible
- Be careful with production legacy database access
- Always backup before running delete operations