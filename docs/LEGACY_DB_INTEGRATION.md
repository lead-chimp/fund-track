# Legacy Database Integration

This document describes the legacy MS SQL Server database integration for importing leads from the existing LeadData2 system.

## Overview

The legacy database integration consists of two main components:

1. **LegacyDatabase** - A connection utility for MS SQL Server
2. **LeadPoller** - A service for polling and importing leads

## Configuration

### Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Legacy MS SQL Server Configuration
LEGACY_DB_SERVER="your-server-name"
LEGACY_DB_PORT="1433"
LEGACY_DB_USER="your-username"
LEGACY_DB_PASSWORD="your-password"
LEGACY_DB_DATABASE="LeadData2"
LEGACY_DB_ENCRYPT="true"
LEGACY_DB_TRUST_CERT="true"
LEGACY_DB_REQUEST_TIMEOUT="30000"
LEGACY_DB_CONNECTION_TIMEOUT="15000"

# Campaign Configuration
MERCHANT_FUNDING_CAMPAIGN_IDS="123,456,789"  # Comma-separated list
LEAD_POLLING_BATCH_SIZE="100"
```

### Database Schema Requirements

The legacy database should have a `Leads` table with the following structure:

```sql
CREATE TABLE Leads (
    ID BIGINT PRIMARY KEY,
    CampaignID INT NOT NULL,
    Email NVARCHAR(255),
    Phone NVARCHAR(20),
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    BusinessName NVARCHAR(255),
    CreatedDate DATETIME
    -- Additional fields are supported
);
```

## Usage

### Basic Connection Test

Test your legacy database connection:

```bash
npx tsx scripts/test-legacy-db.ts
```

### Manual Lead Polling

```typescript
import { createLeadPoller } from '@/services/LeadPoller';

const leadPoller = createLeadPoller();
const result = await leadPoller.pollAndImportLeads();

console.log('Polling result:', result);
```

### Using the LegacyDatabase Directly

```typescript
import { getLegacyDatabase } from '@/lib/legacy-db';

const legacyDb = getLegacyDatabase();

try {
  await legacyDb.connect();
  
  const leads = await legacyDb.query(
    'SELECT * FROM Leads WHERE CampaignID = @campaignId',
    { campaignId: 123 }
  );
  
  console.log('Found leads:', leads);
} finally {
  await legacyDb.disconnect();
}
```

## Features

### Data Transformation

The LeadPoller automatically transforms legacy data:

- **String Sanitization**: Trims whitespace and handles null/empty values
- **Phone Formatting**: Removes non-digit characters and validates length
- **Duplicate Prevention**: Uses `legacy_lead_id` to avoid importing duplicates
- **Status Management**: Sets new leads to "NEW" status

### Error Handling

- Connection retry logic with configurable timeouts
- Batch processing to handle large datasets
- Individual lead error isolation (one failed lead doesn't stop the batch)
- Comprehensive error logging and reporting

### Performance Features

- Configurable batch size for memory management
- Connection pooling for efficient database usage
- Parallel processing of lead batches
- Progress tracking and timing metrics

## API Reference

### LeadPoller Class

#### Constructor Options

```typescript
interface LeadPollerConfig {
  campaignIds: number[];      // Required: Campaign IDs to filter
  batchSize?: number;         // Optional: Batch size (default: 100)
  maxRetries?: number;        // Optional: Max retries (default: 3)
  retryDelay?: number;        // Optional: Retry delay ms (default: 1000)
}
```

#### Methods

- `pollAndImportLeads()`: Main polling method that imports new leads
- `getLeadsNeedingIntakeTokens()`: Get leads that need intake tokens generated
- `updateLeadWithIntakeToken(leadId, token)`: Update lead with intake token

#### Return Types

```typescript
interface PollingResult {
  totalProcessed: number;     // Total leads processed
  newLeads: number;          // New leads imported
  duplicatesSkipped: number; // Duplicates skipped
  errors: string[];          // Error messages
  processingTime: number;    // Processing time in ms
}
```

### LegacyDatabase Class

#### Methods

- `connect()`: Establish database connection
- `disconnect()`: Close database connection
- `query<T>(sql, params?)`: Execute SQL query with optional parameters
- `testConnection()`: Test database connectivity
- `isConnected()`: Check connection status

## Security Considerations

1. **Connection Encryption**: Always use encrypted connections in production
2. **Credential Management**: Store database credentials securely
3. **SQL Injection Prevention**: Use parameterized queries
4. **Connection Timeouts**: Configure appropriate timeouts to prevent hanging connections
5. **Access Control**: Use database users with minimal required permissions

## Monitoring and Logging

The integration provides comprehensive logging:

- Connection status and errors
- Query execution times
- Lead processing statistics
- Individual lead import failures
- Batch processing progress

All logs include timestamps and contextual information for debugging.

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check network connectivity
   - Verify server name and port
   - Increase connection timeout values

2. **Authentication Failed**
   - Verify username and password
   - Check SQL Server authentication mode
   - Ensure user has necessary permissions

3. **SSL/TLS Errors**
   - Set `LEGACY_DB_TRUST_CERT="true"` for self-signed certificates
   - Configure proper SSL certificates on SQL Server

4. **No Leads Found**
   - Verify campaign IDs are correct
   - Check if leads exist in the legacy database
   - Ensure the Leads table structure matches expectations

### Debug Mode

Enable detailed logging by setting the log level:

```typescript
// In your application
console.log('Debug mode enabled');
```

## Testing

Run the test suite:

```bash
npm test -- --testPathPatterns=LeadPoller.test.ts
```

The tests cover:
- Connection handling
- Data transformation
- Error scenarios
- Duplicate detection
- Batch processing
- Environment configuration

## Performance Tuning

### Batch Size Optimization

- **Small datasets (< 1000 leads)**: Use batch size 50-100
- **Medium datasets (1000-10000 leads)**: Use batch size 100-500
- **Large datasets (> 10000 leads)**: Use batch size 500-1000

### Connection Pool Settings

Adjust connection timeouts based on your network:

```bash
LEGACY_DB_CONNECTION_TIMEOUT="30000"  # 30 seconds
LEGACY_DB_REQUEST_TIMEOUT="60000"     # 60 seconds
```

### Memory Usage

Monitor memory usage during large imports and adjust batch size accordingly.