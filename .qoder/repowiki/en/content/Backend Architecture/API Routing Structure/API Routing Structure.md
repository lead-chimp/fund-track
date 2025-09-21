# API Routing Structure

<cite>
**Referenced Files in This Document**   
- [route.ts](file://src/app/api/leads/route.ts)
- [route.ts](file://src/app/api/leads/[id]/route.ts)
- [route.ts](file://src/app/api/intake/[token]/route.ts)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts)
- [route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [route.ts](file://src/app/api/auth/[...nextauth]/route.ts)
- [route.ts](file://src/app/api/health/live/route.ts)
- [errors.ts](file://src/lib/errors.ts)
- [monitoring.ts](file://src/lib/monitoring.ts)
- [prisma.ts](file://src/lib/prisma.ts)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts)
- [middleware.ts](file://src/middleware.ts)
- [route.ts](file://src/app/api/leads/[id]/share/route.ts) - *Added in recent commit*
- [route.ts](file://src/app/api/share/[token]/documents/[documentId]/route.ts) - *Added in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Added new section for Lead Sharing API to document the newly implemented share feature
- Updated Project Structure section to include the new share API routes
- Added new sequence diagram for the lead sharing workflow
- Added new diagram for shared document access flow
- Updated dependency analysis to include the new FileUploadService
- Added sources for newly created files and updated sections

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The fund-track application implements a robust API routing structure using Next.js App Router conventions. This document provides a comprehensive analysis of the API routing system, focusing on file-based routing, dynamic route segments, nested route organization, and implementation patterns for various business features including lead management, intake processing, and administrative operations. The analysis covers request handling, parameter extraction, validation, error handling, and integration with middleware and context.

## Project Structure
The API routing structure follows a logical organization based on business domains and functionality. The routes are organized under the `src/app/api` directory with subdirectories for different feature areas:

- **admin**: Administrative operations and system management
- **auth**: Authentication and session management
- **cron**: Scheduled background jobs and automated processes
- **dev**: Development and testing endpoints
- **health**: System health monitoring and liveness checks
- **intake**: Application intake workflow
- **leads**: Lead management and tracking
- **metrics**: Performance and monitoring metrics
- **monitoring**: System status and monitoring
- **share**: Secure sharing of lead information and documents

This organization enables clear separation of concerns and makes the API structure intuitive to navigate.

```mermaid
graph TD
A[/api] --> B[admin]
A --> C[auth]
A --> D[cron]
A --> E[dev]
A --> F[health]
A --> G[intake]
A --> H[leads]
A --> I[metrics]
A --> J[monitoring]
A --> K[share]
B --> B1[background-jobs]
B --> B2[cleanup]
B --> B3[connectivity]
B --> B4[notifications]
B --> B5[settings]
B --> B6[users]
C --> C1[[...nextauth]]
C --> C2[session]
D --> D1[poll-leads]
D --> D2[send-followups]
G --> G1[[token]]
H --> H1[[id]]
H --> H2[share]
F --> F1[live]
F --> F2[ready]
K --> K1[[token]]
K --> K2[documents]
K --> K3[[documentId]]
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L159-L189)

**Section sources**
- [middleware.ts](file://src/middleware.ts#L128-L162)

## Core Components
The API routing system is built on several core components that provide essential functionality:

1. **Error Handling**: Standardized error responses using the `withErrorHandler` middleware
2. **Authentication**: Integration with NextAuth for session management
3. **Database Access**: Prisma client with enhanced error handling and retry logic
4. **Logging**: Comprehensive logging system for API requests and operations
5. **Validation**: Input validation and parameter extraction
6. **Performance Monitoring**: Request timing and performance tracking

These components work together to create a robust and maintainable API system.

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L0-L47)
- [monitoring.ts](file://src/lib/monitoring.ts#L0-L76)
- [prisma.ts](file://src/lib/prisma.ts#L0-L60)

## Architecture Overview
The API architecture follows a layered approach with clear separation between routing, business logic, and data access. The Next.js App Router handles route resolution based on the file system structure, while API routes implement specific HTTP methods (GET, POST, PUT, DELETE) to handle requests.

The architecture incorporates several key patterns:
- **Middleware Integration**: Authentication and authorization checks
- **Error Handling Middleware**: Standardized error responses
- **Database Connection Management**: Prisma client with connection pooling
- **Request Validation**: Input parameter validation and sanitization
- **Response Formatting**: Consistent JSON response structure

```mermaid
graph TD
Client[Client Application] --> |HTTP Request| Router[Next.js Router]
Router --> |Route Resolution| APIRoute[API Route Handler]
APIRoute --> |Authentication Check| Auth[Authentication Middleware]
Auth --> |Validated| ErrorHandler[Error Handling Middleware]
ErrorHandler --> |Business Logic| Service[Business Logic Layer]
Service --> |Data Access| Database[Prisma Client]
Database --> |Query| DB[(Database)]
DB --> |Result| Service
Service --> |Response| ErrorHandler
ErrorHandler --> |Formatted Response| Client
Auth --> |Unauthorized| Client
ErrorHandler --> |Error Response| Client
style APIRoute fill:#f9f,stroke:#333
style Service fill:#bbf,stroke:#333
style Database fill:#f96,stroke:#333
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L128-L162)
- [errors.ts](file://src/lib/errors.ts#L237-L300)
- [prisma.ts](file://src/lib/prisma.ts#L0-L60)

## Detailed Component Analysis

### Lead Management API
The lead management API provides comprehensive CRUD operations for lead records. The implementation demonstrates several key patterns in the routing system.

#### List and Create Leads
The `/api/leads` endpoint handles both listing existing leads and creating new ones. The GET method implements sophisticated filtering and pagination capabilities.

```mermaid
sequenceDiagram
participant Client
participant Route
participant ErrorHandler
participant Auth
participant Prisma
participant DB
Client->>Route : GET /api/leads?page=1&limit=10&search=john
Route->>ErrorHandler : Wrap handler
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Parse query parameters
Route->>Route : Validate pagination
Route->>Route : Build where clause
Route->>Prisma : findMany() with filters
Route->>Prisma : count() for total
Prisma->>DB : Execute queries
DB-->>Prisma : Results
Prisma-->>Route : Leads and count
Route->>Route : Calculate pagination
Route->>Route : Serialize BigInt values
Route-->>Client : JSON response with leads and pagination
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/route.ts#L0-L166)

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts#L0-L166)

#### Individual Lead Operations
The `/api/leads/[id]` endpoint handles operations on individual lead records using dynamic route segments.

```mermaid
sequenceDiagram
participant Client
participant Route
participant Auth
participant Prisma
participant DB
participant StatusService
Client->>Route : GET /api/leads/123
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Parse ID parameter
Route->>Prisma : findUnique() with include
Prisma->>DB : Execute query
DB-->>Prisma : Lead data
Prisma-->>Route : Lead with relations
Route->>Route : Serialize BigInt values
Route-->>Client : JSON response with lead data
Client->>Route : PUT /api/leads/123
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Parse ID parameter
Route->>Route : Validate status and email
Route->>Prisma : findUnique() to check existence
Prisma->>DB : Execute query
DB-->>Prisma : Existing lead
Prisma-->>Route : Lead data
Route->>StatusService : changeLeadStatus() if status changed
StatusService-->>Route : Status change result
Route->>Prisma : update() with new data
Prisma->>DB : Execute update
DB-->>Prisma : Updated lead
Prisma-->>Route : Updated lead data
Route-->>Client : JSON response with updated lead
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/[id]/route.ts#L0-L199)

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/route.ts#L0-L199)

### Intake Processing API
The intake processing API handles the application intake workflow using dynamic route segments for token-based access.

```mermaid
sequenceDiagram
participant Client
participant Route
participant TokenService
participant DB
Client->>Route : GET /api/intake/abc123xyz
Route->>Route : Extract token parameter
Route->>TokenService : validateToken(abc123xyz)
TokenService->>DB : Query token record
DB-->>TokenService : Token data
TokenService-->>Route : Intake session data or null
alt Token valid
Route->>Route : Prepare success response
Route-->>Client : {success : true, data : {...}}
else Token invalid or expired
Route->>Route : Prepare error response
Route-->>Client : {error : "Invalid or expired token"}, 404
end
```

**Diagram sources**
- [route.ts](file://src/app/api/intake/[token]/route.ts#L0-L37)

**Section sources**
- [route.ts](file://src/app/api/intake/[token]/route.ts#L0-L37)

### Admin Settings API
The admin settings API demonstrates the use of dynamic route segments for managing system settings.

```mermaid
sequenceDiagram
participant Client
participant Route
participant Auth
participant SettingsService
participant DB
Client->>Route : GET /api/admin/settings/api-key
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Check admin role
Route->>Route : Extract key parameter
Route->>SettingsService : getSettingRaw(api-key)
SettingsService->>DB : Query setting record
DB-->>SettingsService : Setting data
SettingsService-->>Route : Setting object
Route-->>Client : {setting : {...}}
Client->>Route : PUT /api/admin/settings/api-key
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Check admin role
Route->>Route : Extract key parameter
Route->>Route : Parse request body
Route->>Route : Validate value
Route->>SettingsService : updateSetting(api-key, new-value, user-id)
SettingsService->>DB : Update setting record
DB-->>SettingsService : Updated setting
SettingsService-->>Route : Updated setting object
Route-->>Client : {message : "Setting updated successfully", setting : {...}}
```

**Diagram sources**
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L0-L129)

**Section sources**
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L0-L129)

### Authentication API
The authentication API integrates with NextAuth for session management.

```mermaid
sequenceDiagram
participant Client
participant NextAuth
participant AuthOptions
participant DB
Client->>NextAuth : GET /api/auth/session
NextAuth->>AuthOptions : Use configured options
AuthOptions->>DB : Verify session
DB-->>AuthOptions : Session data
AuthOptions-->>NextAuth : Session object
NextAuth-->>Client : Session data
Client->>NextAuth : POST /api/auth/signin
NextAuth->>AuthOptions : Handle credentials
AuthOptions->>DB : Verify credentials
DB-->>AuthOptions : User data
AuthOptions-->>NextAuth : Create session
NextAuth-->>Client : Session cookie
```

**Diagram sources**
- [route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L0-L5)

**Section sources**
- [route.ts](file://src/app/api/auth/[...nextauth]/route.ts#L0-L5)

### Cron Job API
The cron job API handles automated background processes like lead polling.

```mermaid
flowchart TD
A[POST /api/cron/poll-leads] --> B[Authentication Check]
B --> C{Valid Session?}
C --> |No| D[Return 401 Unauthorized]
C --> |Yes| E[Create Lead Poller]
E --> F[Poll and Import Leads]
F --> G{New Leads?}
G --> |No| H[Return Success Response]
G --> |Yes| I[Find New Leads for Notifications]
I --> J[Send Email Notifications]
J --> K[Send SMS Notifications]
K --> L[Aggregate Results]
L --> M[Return Response with Results]
style A fill:#f9f,stroke:#333
style D fill:#f66,stroke:#333
style H fill:#6f6,stroke:#333
style M fill:#6f6,stroke:#333
```

**Diagram sources**
- [route.ts](file://src/app/api/cron/poll-leads/route.ts#L0-L192)

**Section sources**
- [route.ts](file://src/app/api/cron/poll-leads/route.ts#L0-L192)

### Health Check API
The health check API provides liveness probes for system monitoring.

```mermaid
sequenceDiagram
participant Client
participant Route
participant System
Client->>Route : GET /api/health/live
Route->>Route : Check system status
Route->>System : Get uptime and PID
System-->>Route : System information
Route->>Route : Create response object
Route-->>Client : {status : 'alive', timestamp, uptime, pid}
alt System error
Route->>Route : Create error response
Route-->>Client : {status : 'dead', error}, 503
end
```

**Diagram sources**
- [route.ts](file://src/app/api/health/live/route.ts#L0-L27)

**Section sources**
- [route.ts](file://src/app/api/health/live/route.ts#L0-L27)

### Lead Sharing API
The lead sharing API enables secure sharing of lead information with external parties through time-limited, token-based URLs. This feature allows authorized users to generate shareable links for specific leads, which can be accessed without requiring authentication.

#### Create and Manage Share Links
The `/api/leads/[id]/share` endpoint provides POST, GET, and DELETE operations for managing share links for a specific lead.

```mermaid
sequenceDiagram
participant Client
participant Route
participant Auth
participant Prisma
participant DB
Client->>Route : POST /api/leads/123/share
Route->>Auth : getServerSession()
Auth-->>Route : Session data
Route->>Route : Parse lead ID
Route->>Prisma : Verify lead exists
Prisma->>DB : Query lead record
DB-->>Prisma : Lead data
Prisma-->>Route : Lead verification
Route->>Route : Generate secure token
Route->>Prisma : Deactivate existing active links
Route->>Prisma : Create new share link
Prisma->>DB : Insert share link
DB-->>Prisma : Created link
Prisma-->>Route : Share link data
Route->>Route : Construct share URL
Route-->>Client : {success : true, shareLink : {...}}
```

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L196)

**Diagram sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L196)

#### Access Shared Documents
The `/api/share/[token]/documents/[documentId]` endpoint allows access to specific documents through a share token without authentication.

```mermaid
sequenceDiagram
participant Client
participant Route
participant Prisma
participant DB
participant FileUploadService
participant B2
Client->>Route : GET /api/share/abc123xyz/documents/456
Route->>Route : Extract token and document ID
Route->>Prisma : Validate share link
Prisma->>DB : Query share link
DB-->>Prisma : Share link data
Prisma-->>Route : Link validation
Route->>Prisma : Verify document access
Prisma->>DB : Query document
DB-->>Prisma : Document data
Prisma-->>Route : Document verification
Route->>FileUploadService : downloadFile()
FileUploadService->>B2 : Request file
B2-->>FileUploadService : File data
FileUploadService-->>Route : File buffer
Route->>Route : Set response headers
Route-->>Client : File download response
```

**Section sources**
- [route.ts](file://src/app/api/share/[token]/documents/[documentId]/route.ts#L0-L67)

**Diagram sources**
- [route.ts](file://src/app/api/share/[token]/documents/[documentId]/route.ts#L0-L67)

## Dependency Analysis
The API routes depend on several key components and services that provide essential functionality.

```mermaid
graph TD
A[API Routes] --> B[Next.js Runtime]
A --> C[NextAuth]
A --> D[Prisma Client]
A --> E[Custom Libraries]
A --> F[FileUploadService]
E --> G[errors.ts]
E --> H[monitoring.ts]
E --> I[logger.ts]
E --> J[database-error-handler.ts]
F --> K[Backblaze B2]
G --> L[Error Classes]
G --> M[Error Handling Middleware]
H --> N[Performance Monitoring]
H --> O[Error Tracking]
J --> P[Database Retry Logic]
J --> Q[Error Transformation]
D --> R[Database]
style A fill:#f9f,stroke:#333
style E fill:#bbf,stroke:#333
style D fill:#f96,stroke:#333
style F fill:#69f,stroke:#333
```

**Diagram sources**
- [errors.ts](file://src/lib/errors.ts#L0-L339)
- [monitoring.ts](file://src/lib/monitoring.ts#L0-L276)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L0-L320)
- [prisma.ts](file://src/lib/prisma.ts#L0-L60)
- [FileUploadService.ts](file://src/services/FileUploadService.ts#L0-L150)

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L0-L339)
- [monitoring.ts](file://src/lib/monitoring.ts#L0-L276)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L0-L320)
- [prisma.ts](file://src/lib/prisma.ts#L0-L60)
- [FileUploadService.ts](file://src/services/FileUploadService.ts#L0-L150)

## Performance Considerations
The API implementation includes several performance optimization patterns:

1. **Caching**: The system uses in-memory stores for rate limiting and metrics
2. **Database Optimization**: Prisma queries include only necessary fields and use efficient filtering
3. **Error Handling**: Centralized error handling reduces code duplication
4. **Connection Management**: Prisma client is singleton and properly managed
5. **Request Validation**: Early validation prevents unnecessary processing
6. **Pagination**: Large datasets are paginated to reduce memory usage

The `executeDatabaseOperation` function wraps database operations with retry logic and error handling, ensuring resilience against transient database issues. The `withPerformanceMonitoring` middleware tracks execution time and can identify slow operations.

**Section sources**
- [monitoring.ts](file://src/lib/monitoring.ts#L77-L276)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L200-L320)

## Troubleshooting Guide
When troubleshooting API route issues, consider the following common problems and solutions:

1. **Authentication Issues**: Ensure valid session and proper role permissions
2. **Database Connection Problems**: Check DATABASE_URL environment variable and network connectivity
3. **Validation Errors**: Verify request parameters and body structure
4. **Rate Limiting**: Check if rate limiting is enabled and adjust settings if needed
5. **Dynamic Route Parameters**: Ensure proper parameter extraction using `await params`
6. **BigInt Serialization**: Remember to convert BigInt values to strings before JSON serialization

The comprehensive logging system can help identify issues by providing detailed information about API requests, database operations, and errors.

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L196-L249)
- [middleware.ts](file://src/middleware.ts#L0-L45)
- [prisma.ts](file://src/lib/prisma.ts#L0-L60)

## Conclusion
The API routing structure in the fund-track application demonstrates a well-architected implementation using Next.js App Router conventions. The system effectively uses file-based routing, dynamic route segments, and nested route organization to create a maintainable and scalable API. Key features include comprehensive error handling, authentication integration, performance monitoring, and robust database access patterns. The implementation follows best practices for API design and provides a solid foundation for the application's business functionality.