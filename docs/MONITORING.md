# Monitoring and Error Tracking

This document describes the monitoring and error tracking system implemented in Fund Track App using local logging and custom monitoring utilities.

## Overview

The application uses a local monitoring system that includes:

- **Local Error Tracking**: Error tracking and logging using Winston
- **Custom Monitoring**: Performance metrics, error tracking, and health checks
- **Winston Logging**: Structured logging with multiple transports
- **Health Checks**: Comprehensive system health monitoring

## Configuration

### Environment Variables

```bash
# Error monitoring is now handled locally through Winston logging
# No external error reporting service is configured
```

### Features

- **Local error logging**: All errors are logged locally using Winston
- **Performance monitoring**: Tracks API response times and database queries
- **Health monitoring**: Comprehensive system health checks
- **Metrics collection**: In-memory metrics collection for performance analysis

## Custom Monitoring System

### Core Functions

#### Error Tracking

```typescript
import { trackError } from '@/lib/monitoring';

trackError({
  name: 'database_connection_error',
  error: new Error('Connection timeout'),
  timestamp: Date.now(),
  context: {
    userId: '123',
    operation: 'user_lookup'
  }
});
```

#### Performance Tracking

```typescript
import { trackPerformance } from '@/lib/monitoring';

trackPerformance({
  name: 'api_response_time',
  duration: 150,
  timestamp: Date.now(),
  metadata: {
    endpoint: '/api/leads',
    method: 'GET'
  }
});
```

#### API Handler Monitoring

```typescript
import { withPerformanceMonitoring } from '@/lib/monitoring';

async function myApiHandler() {
  // Your API logic here
  return { success: true };
}

export const GET = withPerformanceMonitoring('my_api_handler', myApiHandler);
```

#### User Context (Local Logging)

```typescript
import { setSentryUser } from '@/lib/monitoring'; // Legacy function name, now logs locally

setSentryUser({
  id: '123',
  email: 'user@example.com',
  role: 'admin'
});
```

#### Custom Context (Local Logging)

```typescript
import { setSentryContext } from '@/lib/monitoring'; // Legacy function name, now logs locally

setSentryContext('business_context', {
  leadId: 'lead_123',
  status: 'processing'
});
```

#### Breadcrumbs (Local Logging)

```typescript
import { addSentryBreadcrumb } from '@/lib/monitoring'; // Legacy function name, now logs locally

addSentryBreadcrumb('User uploaded document', {
  documentType: 'bank_statement',
  fileSize: 2048576
});
```

#### Custom Messages (Local Logging)

```typescript
import { captureSentryMessage } from '@/lib/monitoring'; // Legacy function name, now logs locally

captureSentryMessage('Lead processing completed successfully', 'info');
```

#### Performance Spans (Local Logging)

```typescript
import { startSentrySpan } from '@/lib/monitoring'; // Legacy function name, now logs locally

// Using the span utility
const span = startSentrySpan('database_query', 'db.query');
// Your database operation here
```

## Health Checks

### Endpoint

```
GET /api/health
```

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45,
      "details": "Connected to PostgreSQL"
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "used": 512,
        "total": 2048,
        "percentage": 25
      }
    },
    "disk": {
      "status": "healthy",
      "usage": {
        "percentage": 45
      }
    }
  }
}
```

## Monitoring Status

### Endpoint

```
GET /api/monitoring/status
```

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "monitoring": {
    "errorReportingEnabled": false,
    "environment": "production",
    "metricsStoreSize": 25,
    "errorStoreSize": 5,
    "uptime": 3600,
    "logging": {
      "enabled": true,
      "error": null
    }
  },
  "metrics": {
    "performance": {
      "totalOperations": 10,
      "operations": {
        "api_leads_get": {
          "count": 50,
          "averageTime": 120,
          "minTime": 45,
          "maxTime": 300
        }
      }
    },
    "errors": {
      "totalErrorTypes": 2,
      "errors": {
        "database_error": {
          "count": 3,
          "lastOccurred": 1642248600000,
          "lastError": "Connection timeout"
        }
      }
    }
  }
}
```

## Metrics Collection

### Performance Metrics

The system automatically collects:

- API response times
- Database query latencies
- File upload durations
- Background job execution times

### Error Metrics

The system tracks:

- Error frequency by type
- Error patterns and trends
- Last occurrence timestamps
- Error context and metadata

## Logging

### Winston Configuration

The application uses Winston for structured logging with:

- **Console transport**: Development logging
- **File transport**: Production log files
- **Error-specific files**: Separate error logs
- **JSON formatting**: Structured log data

### Log Levels

- `error`: Application errors and exceptions
- `warn`: Warning conditions and slow operations
- `info`: General application information
- `debug`: Detailed debugging information

## Best Practices

### Error Handling

1. **Always track errors**: Use `trackError()` for all caught exceptions
2. **Include context**: Add relevant metadata to error tracking
3. **Use meaningful names**: Choose descriptive error names for categorization

### Performance Monitoring

1. **Monitor critical paths**: Track performance of important operations
2. **Set thresholds**: Define acceptable performance limits
3. **Regular review**: Analyze performance metrics regularly

### Health Checks

1. **Comprehensive checks**: Include all critical system components
2. **Meaningful status**: Provide actionable health information
3. **Regular monitoring**: Set up automated health check monitoring

## Troubleshooting

### Common Issues

#### High Error Rates
1. Check error logs in Winston output
2. Review error metrics in monitoring status
3. Analyze error patterns and context

#### Performance Issues
1. Review performance metrics
2. Check for slow operations in logs
3. Analyze database query performance

#### Health Check Failures
1. Check individual component status
2. Review system resource usage
3. Verify database connectivity