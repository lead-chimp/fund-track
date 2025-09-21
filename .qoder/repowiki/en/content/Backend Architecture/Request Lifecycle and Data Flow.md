# Request Lifecycle and Data Flow

<cite>
**Referenced Files in This Document**   
- [middleware.ts](file://src/middleware.ts#L1-L189)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [errors.ts](file://src/lib/errors.ts#L1-L340)
- [logger.ts](file://src/lib/logger.ts#L1-L351)
- [route.ts](file://src/app/api/leads/[id]/status/route.ts#L1-L64)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Request Ingress and Middleware Processing](#request-ingress-and-middleware-processing)
3. [Authentication and Authorization Flow](#authentication-and-authorization-flow)
4. [API Route Handling](#api-route-handling)
5. [Service Layer and Business Logic](#service-layer-and-business-logic)
6. [Prisma Operations and Database Interaction](#prisma-operations-and-database-interaction)
7. [Error Handling and Propagation](#error-handling-and-propagation)
8. [Response Generation and Serialization](#response-generation-and-serialization)
9. [Logging and Context Preservation](#logging-and-context-preservation)
10. [End-to-End Example: Updating Lead Status](#end-to-end-example-updating-lead-status)
11. [End-to-End Example: Submitting Intake Data](#end-to-end-example-submitting-intake-data)

## Introduction
This document provides a comprehensive analysis of the request lifecycle and data flow in the fund-track backend system. It traces the journey of an HTTP request from initial ingress through middleware, authentication, API route handling, service invocation, Prisma operations, and response generation. The document illustrates data transformation at each layer, including input validation, business logic processing, and output serialization. It also documents error propagation and handling strategies across layers, including database error translation and client-facing error responses. The analysis highlights logging practices and contextual information preserved throughout the request lifecycle, using concrete examples such as updating a lead status or submitting intake data to demonstrate end-to-end flow.

## Request Ingress and Middleware Processing

The request lifecycle begins with the Next.js middleware, which acts as the first point of contact for incoming HTTP requests. The middleware performs several critical functions including rate limiting, security header injection, and request routing.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Middleware as "Next.js Middleware"
participant RateLimit as "Rate Limit Store"
participant Security as "Security Headers"
Client->>Middleware : HTTP Request
Middleware->>RateLimit : Check rate limit
alt Rate limiting enabled
RateLimit-->>Middleware : Allow/Deny
alt Request allowed
Middleware->>Security : Add security headers
Security-->>Middleware : Enhanced response
Middleware->>NextHandler : Continue processing
else Request denied
Middleware-->>Client : 429 Too Many Requests
end
else Rate limiting disabled
Middleware->>Security : Add security headers
Security-->>Middleware : Enhanced response
Middleware->>NextHandler : Continue processing
end
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)

**Section sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)

## Authentication and Authorization Flow

The authentication and authorization flow is implemented through Next-Auth integration in the middleware. The system checks for valid sessions and enforces access controls based on user roles and route requirements.

```mermaid
flowchart TD
Start([Request Received]) --> CheckPath["Check Request Path"]
CheckPath --> |Path: /application/*| AllowAccess["Allow Access Without Authentication"]
CheckPath --> |Path: /api/health| AllowAccess
CheckPath --> |Path: /api/dev/*| CheckDevEnv["Check Development Environment"]
CheckDevEnv --> |Dev Mode| AllowAccess
CheckDevEnv --> |Prod Mode| CheckEnvVar["Check ENABLE_DEV_ENDPOINTS"]
CheckEnvVar --> |Enabled| AllowAccess
CheckEnvVar --> |Disabled| DenyAccess["Return 403 Forbidden"]
CheckPath --> |Path: /dashboard/* or /api/*| CheckAuthentication["Check Authentication"]
CheckAuthentication --> |No Token| RedirectLogin["Redirect to /auth/signin"]
CheckAuthentication --> |Has Token| CheckAdmin["Check Admin Routes"]
CheckAdmin --> |Path: /admin/*| CheckRole["Verify ADMIN Role"]
CheckRole --> |Is Admin| AllowAccess
CheckRole --> |Not Admin| RedirectDashboard["Redirect to /dashboard"]
CheckAdmin --> |Not Admin Route| AllowAccess
AllowAccess --> ContinueProcessing["Continue to Next Handler"]
DenyAccess --> ContinueProcessing
RedirectLogin --> ContinueProcessing
RedirectDashboard --> ContinueProcessing
style Start fill:#4CAF50,stroke:#388E3C
style AllowAccess fill:#4CAF50,stroke:#388E3C
style DenyAccess fill:#F44336,stroke:#D32F2F
style RedirectLogin fill:#FF9800,stroke:#F57C00
style RedirectDashboard fill:#FF9800,stroke:#F57C00
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)

**Section sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)

## API Route Handling

API route handling is implemented using Next.js App Router conventions. Each API endpoint is defined as a route.ts file that exports HTTP method handlers (GET, POST, PUT, DELETE, etc.). The route handlers receive the request and route parameters, perform necessary processing, and return a response.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Route as "API Route Handler"
participant Session as "Next-Auth Session"
participant Validation as "Input Validation"
participant Service as "Service Layer"
participant Response as "Response Generator"
Client->>Route : HTTP Request
Route->>Session : getServerSession()
alt Session exists
Session-->>Route : Session data
Route->>Validation : Validate input parameters
alt Valid input
Validation-->>Route : Validation success
Route->>Service : Call service method
Service-->>Route : Processed data
Route->>Response : Generate response
Response-->>Client : HTTP Response (200)
else Invalid input
Validation-->>Route : Validation error
Route->>Response : Generate error response
Response-->>Client : HTTP Response (400)
end
else No session
Session-->>Route : null
Route->>Response : Generate unauthorized response
Response-->>Client : HTTP Response (401)
end
```

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/status/route.ts#L1-L64)

## Service Layer and Business Logic

The service layer contains the core business logic of the application. Services encapsulate domain-specific operations and coordinate between different data sources and external systems. The LeadStatusService, for example, manages lead status transitions and maintains status history.

```mermaid
classDiagram
class LeadStatusService {
+getLeadStatusHistory(leadId : number) : Promise<Result>
+getAvailableTransitions(currentStatus : string) : string[]
+updateLeadStatus(leadId : number, newStatus : string, userId : string, notes : string) : Promise<Result>
-validateStatusTransition(current : string, target : string) : boolean
-createStatusHistoryEntry(leadId : number, status : string, userId : string, notes : string) : Promise<void>
}
class Result {
+success : boolean
+data? : any
+error? : string
+message? : string
}
class PrismaClient {
+lead : LeadModel
+leadStatusHistory : LeadStatusHistoryModel
}
class LeadModel {
+findUnique(where : object) : Promise<Lead|null>
+update(data : object) : Promise<Lead>
}
class LeadStatusHistoryModel {
+create(data : object) : Promise<LeadStatusHistory>
+findMany(where : object) : Promise<LeadStatusHistory[]>
}
LeadStatusService --> PrismaClient : "uses"
LeadStatusService --> Result : "returns"
PrismaClient --> LeadModel : "contains"
PrismaClient --> LeadStatusHistoryModel : "contains"
```

**Section sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)

## Prisma Operations and Database Interaction

Database interactions are managed through Prisma ORM, which provides a type-safe interface for database operations. The Prisma client is configured with connection pooling, query logging, and error handling. Database operations are wrapped with retry logic and comprehensive error translation.

```mermaid
sequenceDiagram
participant Service as "Service Layer"
participant DBWrapper as "Database Operation Wrapper"
participant Retry as "Retry Mechanism"
participant Prisma as "Prisma Client"
participant Database as "PostgreSQL"
Service->>DBWrapper : executeDatabaseOperation()
DBWrapper->>Retry : withDatabaseRetry()
Retry->>Prisma : operation()
Prisma->>Database : Execute query
alt Query successful
Database-->>Prisma : Return data
Prisma-->>Retry : Return result
Retry-->>DBWrapper : Return result
DBWrapper-->>Service : Return processed data
else Query failed
Database-->>Prisma : Error
Prisma-->>Retry : Throw error
Retry->>Retry : isRetryableError()?
alt Error is retryable
Retry->>Retry : Calculate delay
Retry->>Retry : Wait (exponential backoff)
Retry->>Prisma : Retry operation
else Error not retryable
Retry-->>DBWrapper : Throw transformed error
DBWrapper-->>Service : Throw error
end
end
```

**Diagram sources**
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)

**Section sources**
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)

## Error Handling and Propagation

The error handling system provides a comprehensive hierarchy of application-specific errors that are translated into standardized client-facing responses. Errors are transformed from low-level database exceptions to meaningful operational errors with appropriate HTTP status codes.

```mermaid
classDiagram
class AppError {
<<abstract>>
+statusCode : number
+code : string
+isOperational : boolean
+context? : object
}
class ValidationError {
+statusCode = 400
+code = "VALIDATION_ERROR"
+field? : string
}
class AuthenticationError {
+statusCode = 401
+code = "AUTHENTICATION_ERROR"
}
class AuthorizationError {
+statusCode = 403
+code = "AUTHORIZATION_ERROR"
}
class NotFoundError {
+statusCode = 404
+code = "NOT_FOUND_ERROR"
+resource : string
+id? : string|number
}
class ConflictError {
+statusCode = 409
+code = "CONFLICT_ERROR"
}
class RateLimitError {
+statusCode = 429
+code = "RATE_LIMIT_ERROR"
}
class DatabaseError {
+statusCode = 500
+code = "DATABASE_ERROR"
+operation? : string
}
class ExternalServiceError {
+statusCode = 502
+code = "EXTERNAL_SERVICE_ERROR"
+service : string
+originalError? : Error
}
class InternalServerError {
+statusCode = 500
+code = "INTERNAL_SERVER_ERROR"
}
AppError <|-- ValidationError
AppError <|-- AuthenticationError
AppError <|-- AuthorizationError
AppError <|-- NotFoundError
AppError <|-- ConflictError
AppError <|-- RateLimitError
AppError <|-- DatabaseError
AppError <|-- ExternalServiceError
AppError <|-- InternalServerError
class ErrorTransformer {
+transformPrismaError(error : unknown, operation? : string) : AppError
+withErrorHandler(handler : Function) : Function
+createErrorResponse(error : AppError, requestId? : string) : NextResponse
}
ErrorTransformer --> AppError : "creates"
ErrorTransformer --> ValidationError : "creates"
ErrorTransformer --> AuthenticationError : "creates"
ErrorTransformer --> AuthorizationError : "creates"
ErrorTransformer --> NotFoundError : "creates"
ErrorTransformer --> ConflictError : "creates"
ErrorTransformer --> RateLimitError : "creates"
ErrorTransformer --> DatabaseError : "creates"
ErrorTransformer --> ExternalServiceError : "creates"
ErrorTransformer --> InternalServerError : "creates"
```

**Diagram sources**
- [errors.ts](file://src/lib/errors.ts#L1-L340)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L1-L340)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)

## Response Generation and Serialization

Response generation follows a standardized pattern that ensures consistent output format across all API endpoints. Successful responses contain the requested data, while error responses follow a uniform structure with error codes, messages, and contextual details.

```mermaid
flowchart TD
Start([Request Processing]) --> Success{"Operation Successful?"}
Success --> |Yes| TransformData["Transform Data for Output"]
TransformData --> AddMetadata["Add Response Metadata"]
AddMetadata --> CreateSuccessResponse["Create Success Response"]
CreateSuccessResponse --> SetStatusCode["Set Status Code 200"]
SetStatusCode --> SendResponse["Send Response to Client"]
Success --> |No| CheckErrorType["Check Error Type"]
CheckErrorType --> |AppError| CreateAppErrorResponse["Create AppError Response"]
CreateAppErrorResponse --> SetAppErrorStatusCode["Set Status Code from AppError"]
SetAppErrorStatusCode --> SendResponse
CheckErrorType --> |PrismaError| TransformPrismaError["Transform Prisma Error"]
TransformPrismaError --> CreatePrismaErrorResponse["Create Prisma Error Response"]
CreatePrismaErrorResponse --> SetPrismaErrorStatusCode["Set Status Code from Prisma Error"]
SetPrismaErrorStatusCode --> SendResponse
CheckErrorType --> |Other Error| CreateGenericErrorResponse["Create Generic Error Response"]
CreateGenericErrorResponse --> SetGenericErrorStatusCode["Set Status Code 500"]
SetGenericErrorStatusCode --> SendResponse
SendResponse --> End([Response Sent])
style Success fill:#4CAF50,stroke:#388E3C
style SendResponse fill:#4CAF50,stroke:#388E3C
style CheckErrorType fill:#FF9800,stroke:#F57C00
style SetStatusCode fill:#2196F3,stroke:#1976D2
style SetAppErrorStatusCode fill:#2196F3,stroke:#1976D2
style SetPrismaErrorStatusCode fill:#2196F3,stroke:#1976D2
style SetGenericErrorStatusCode fill:#2196F3,stroke:#1976D2
```

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L1-L340)
- [route.ts](file://src/app/api/leads/[id]/status/route.ts#L1-L64)

## Logging and Context Preservation

The logging system preserves contextual information throughout the request lifecycle, enabling effective monitoring, debugging, and auditing. The logger provides structured logging with different levels (error, warn, info, http, debug) and supports child loggers with additional context.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Middleware as "Middleware"
participant Route as "API Route"
participant Service as "Service Layer"
participant DB as "Database Layer"
participant Logger as "Logger"
Client->>Middleware : Request
Middleware->>Logger : apiRequest() - Log request start
Logger-->>Middleware : Logged
Middleware->>Route : Continue
Route->>Logger : info() - Processing request
Logger-->>Route : Logged
Route->>Service : Call service method
Service->>Logger : debug() - Service operation start
Logger-->>Service : Logged
Service->>DB : Database operation
DB->>Logger : database() - Log DB operation
Logger-->>DB : Logged
alt DB operation successful
DB-->>Service : Return data
Service->>Logger : debug() - Service operation complete
else DB operation failed
DB-->>Service : Throw error
Service->>Logger : error() - Service operation failed
end
Service-->>Route : Return result/error
Route->>Logger : http() - Log response
Logger-->>Route : Logged
Route->>Client : Response
Middleware->>Logger : apiRequest() - Log request end with duration
Logger-->>Middleware : Logged
```

**Diagram sources**
- [logger.ts](file://src/lib/logger.ts#L1-L351)
- [middleware.ts](file://src/middleware.ts#L1-L189)

**Section sources**
- [logger.ts](file://src/lib/logger.ts#L1-L351)

## End-to-End Example: Updating Lead Status

This section traces the complete journey of updating a lead's status, from the HTTP request through all layers to the final response.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Middleware as "Next.js Middleware"
participant Auth as "Authentication"
participant Route as "Lead Status Route"
participant Service as "LeadStatusService"
participant DBHandler as "Database Handler"
participant Prisma as "Prisma Client"
participant Database as "PostgreSQL"
participant Logger as "Logger"
participant Response as "Response Generator"
Client->>Middleware : PUT /api/leads/123/status
Middleware->>Logger : Log request start
Middleware->>Auth : Validate session
Auth-->>Middleware : Valid session
Middleware->>Route : Continue request
Route->>Logger : Log route entry
Route->>Route : Parse lead ID (123)
alt Lead ID valid
Route->>Prisma : Find lead by ID
Prisma->>Database : SELECT query
Database-->>Prisma : Lead data
Prisma-->>Route : Return lead
alt Lead found
Route->>Service : getAvailableTransitions(currentStatus)
Service-->>Route : Available transitions
Route->>Service : updateLeadStatus(123, "qualified", "user123", "Ready for review")
Service->>Logger : Log status update attempt
Service->>Service : validateStatusTransition()
alt Transition valid
Service->>DBHandler : withDatabaseTransaction()
DBHandler->>Prisma : Begin transaction
Prisma->>Database : BEGIN
DBHandler->>Prisma : Update lead status
Prisma->>Database : UPDATE lead
DBHandler->>Prisma : Create status history entry
Prisma->>Database : INSERT status_history
DBHandler->>Prisma : Commit transaction
Prisma->>Database : COMMIT
Database-->>Prisma : Success
Prisma-->>DBHandler : Transaction result
DBHandler-->>Service : Update successful
Service->>Logger : Log status update success
Service-->>Route : Success result
Route->>Response : Generate success response
Response-->>Client : 200 OK with data
else Transition invalid
Service-->>Route : Validation error
Route->>Response : Generate error response
Response-->>Client : 400 Bad Request
end
else Lead not found
Route->>Response : Generate error response
Response-->>Client : 404 Not Found
end
else Lead ID invalid
Route->>Response : Generate error response
Response-->>Client : 400 Bad Request
end
Route->>Logger : Log response sent
Middleware->>Logger : Log request end with duration
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)
- [route.ts](file://src/app/api/leads/[id]/status/route.ts#L1-L64)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)
- [logger.ts](file://src/lib/logger.ts#L1-L351)

**Section sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)
- [route.ts](file://src/app/api/leads/[id]/status/route.ts#L1-L64)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)

## End-to-End Example: Submitting Intake Data

This section traces the complete journey of submitting intake data through the application token endpoint, from the HTTP request through all layers to the final response.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Middleware as "Next.js Middleware"
participant Route as "Intake Route"
participant Validation as "Input Validation"
participant Service as "Intake Service"
participant DBHandler as "Database Handler"
participant Prisma as "Prisma Client"
participant Database as "PostgreSQL"
participant Logger as "Logger"
participant Response as "Response Generator"
Client->>Middleware : POST /api/intake/abc123/save
Middleware->>Logger : Log request start
alt Path is intake route
Middleware->>Route : Continue request (no auth required)
else Other path
Middleware->>Auth : Validate session
end
Route->>Logger : Log intake submission
Route->>Route : Validate token (abc123)
Prisma->>Database : SELECT from intake_tokens
Database-->>Prisma : Token data
Prisma-->>Route : Return token
alt Token valid and not expired
Route->>Route : Parse request body
Route->>Validation : Validate intake data
alt Data valid
Validation-->>Route : Validation success
Route->>Service : Process intake data
Service->>Logger : Log intake processing
Service->>DBHandler : withDatabaseTransaction()
DBHandler->>Prisma : Begin transaction
Prisma->>Database : BEGIN
DBHandler->>Prisma : Update lead with intake data
Prisma->>Database : UPDATE lead
DBHandler->>Prisma : Update token status
Prisma->>Database : UPDATE intake_token
DBHandler->>Prisma : Create intake history entry
Prisma->>Database : INSERT intake_history
DBHandler->>Prisma : Commit transaction
Prisma->>Database : COMMIT
Database-->>Prisma : Success
Prisma-->>DBHandler : Transaction result
DBHandler-->>Service : Processing successful
Service->>Logger : Log intake success
Service-->>Route : Success result
Route->>Response : Generate success response
Response-->>Client : 200 OK with success message
else Data invalid
Validation-->>Route : Validation errors
Route->>Response : Generate error response
Response-->>Client : 400 Bad Request with validation errors
end
else Token invalid or expired
Route->>Response : Generate error response
Response-->>Client : 400 Bad Request with token error
end
Route->>Logger : Log response sent
Middleware->>Logger : Log request end with duration
```

**Diagram sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)
- [route.ts](file://src/app/api/intake/[token]/save/route.ts)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [logger.ts](file://src/lib/logger.ts#L1-L351)

**Section sources**
- [middleware.ts](file://src/middleware.ts#L1-L189)
- [prisma.ts](file://src/lib/prisma.ts#L1-L61)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L321)
- [logger.ts](file://src/lib/logger.ts#L1-L351)