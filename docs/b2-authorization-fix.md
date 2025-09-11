# Backblaze B2 Authorization Fix

## Problem Description

The production application was experiencing 401 Unauthorized errors when trying to generate download URLs for documents stored in Backblaze B2. The error occurred in the `FileUploadService.getDownloadUrl()` method:

```
❌ B2 Download: Failed to generate download URL
Request failed with status code 401
```

## Root Cause Analysis

The issue was caused by expired B2 authorization tokens. The original `FileUploadService` implementation had the following problems:

1. **Single Authorization**: The service only authorized once during initialization and never re-authorized
2. **No Token Expiry Handling**: B2 authorization tokens expire after 24 hours, but the service didn't account for this
3. **No Retry Logic**: When authorization failed, there was no mechanism to retry with fresh credentials
4. **Poor Error Handling**: 401 errors weren't specifically handled as authorization issues

## Solution Implementation

### 1. Automatic Token Re-authorization

Added intelligent token refresh logic:

```typescript
private needsReauthorization(): boolean {
  const now = Date.now();
  const timeSinceAuth = now - this.lastAuthTime;
  // Re-authorize if more than 23 hours have passed (1 hour buffer)
  return !this.isInitialized || timeSinceAuth > (23 * 60 * 60 * 1000);
}
```

### 2. Retry Logic with Authorization Recovery

Implemented a robust retry mechanism:

```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Record<string, any> = {}
): Promise<T>
```

Features:
- Detects 401 authorization errors
- Forces re-authorization on auth failures
- Retries operations up to 2 times
- Comprehensive logging for debugging

### 3. Enhanced Logging

Added structured logging using the existing logger service:

- **Success Operations**: Logged with timing and context
- **Authorization Events**: Tracked with timestamps and retry counts
- **Error Details**: Comprehensive error information with categorization
- **External Service Tracking**: Uses `logger.externalService()` for B2 operations

### 4. Monitoring and Debugging Tools

Created several utility scripts:

#### Environment Validation
```bash
node scripts/validate-b2-env.mjs
```
Validates B2 environment variables and their formats.

#### Connection Testing
```bash
node scripts/test-b2-connection.mjs
```
Tests B2 connection, authorization, and download URL generation.

#### Operations Monitoring
```bash
./scripts/monitor-b2-operations.sh -f
```
Real-time monitoring of B2 operations in production logs.

#### Deployment Helper
```bash
./scripts/deploy-b2-fix.sh
```
Validates and prepares the fix for deployment.

## Technical Changes

### Modified Files

1. **`src/services/FileUploadService.ts`**
   - Added automatic re-authorization logic
   - Implemented retry mechanism for all B2 operations
   - Enhanced error handling and logging
   - Added timing tracking for operations

### New Files

1. **`scripts/validate-b2-env.mjs`** - Environment validation
2. **`scripts/test-b2-connection.mjs`** - Connection testing
3. **`scripts/monitor-b2-operations.sh`** - Operations monitoring
4. **`scripts/deploy-b2-fix.sh`** - Deployment helper
5. **`docs/b2-authorization-fix.md`** - This documentation

## Deployment Instructions

### 1. Pre-deployment Validation

```bash
# Validate environment variables
node scripts/validate-b2-env.mjs

# Test B2 connection (optional, in staging)
node scripts/test-b2-connection.mjs

# Build the application
npm run build
```

### 2. Deploy to Production

```bash
# Use the deployment helper
./scripts/deploy-b2-fix.sh

# Or manually deploy your built application
```

### 3. Post-deployment Monitoring

```bash
# Monitor B2 operations in real-time
./scripts/monitor-b2-operations.sh -f

# Check for authorization events
./scripts/monitor-b2-operations.sh --auth

# Monitor errors only
./scripts/monitor-b2-operations.sh --errors
```

## Expected Behavior After Fix

### Normal Operations
- B2 authorization occurs automatically every 23 hours
- All B2 operations include retry logic for transient failures
- Comprehensive logging provides visibility into B2 operations

### Error Recovery
- 401 authorization errors trigger immediate re-authorization
- Operations are retried automatically (up to 2 times)
- Failed operations are logged with detailed context

### Monitoring
- Look for `[EXTERNAL_SERVICE] Backblaze B2` log entries
- Authorization events are logged with timing information
- Retry attempts are tracked and logged

## Log Examples

### Successful Authorization
```json
{
  "message": "[EXTERNAL_SERVICE] Backblaze B2 Authorization",
  "service": "Backblaze B2",
  "operation": "Authorization", 
  "success": true,
  "duration": 1250,
  "authTime": "2025-01-09T15:30:45.123Z"
}
```

### Successful Download URL Generation
```json
{
  "message": "[EXTERNAL_SERVICE] Backblaze B2 Generate download URL",
  "service": "Backblaze B2",
  "operation": "Generate download URL",
  "success": true,
  "duration": 450,
  "fileId": "4_z5a2a7d71f7af6da79b820e17_f106ef8eea590264f",
  "fileName": "leads/963/1757084913782-02f18794-FUND TRACK TEST DOC 1.pdf"
}
```

### Authorization Retry
```json
{
  "message": "B2 authorization error during Generate download URL, forcing re-authorization",
  "retryCount": 0,
  "timeSinceLastAuth": 86400000,
  "error": "Request failed with status code 401"
}
```

## Testing Checklist

- [ ] Environment variables validated
- [ ] B2 connection test passes
- [ ] Application builds successfully
- [ ] Document downloads work in production
- [ ] Authorization events appear in logs
- [ ] Retry logic works for transient failures
- [ ] No more 401 errors in production logs

## Rollback Plan

If issues occur, the fix can be rolled back by:

1. Reverting `src/services/FileUploadService.ts` to the previous version
2. Rebuilding and redeploying the application
3. The original singleton pattern ensures no breaking changes to the API

## Future Improvements

1. **Metrics Collection**: Add metrics for B2 operation success rates and timing
2. **Health Checks**: Include B2 connectivity in application health checks
3. **Caching**: Implement download URL caching to reduce B2 API calls
4. **Circuit Breaker**: Add circuit breaker pattern for B2 service failures