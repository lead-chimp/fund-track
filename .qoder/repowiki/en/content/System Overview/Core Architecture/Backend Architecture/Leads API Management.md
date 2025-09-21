# Leads API Management

<cite>
**Referenced Files in This Document**   
- [route.ts](file://src/app/api/leads/route.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [prisma.ts](file://src/lib/prisma.ts)
</cite>

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
This document provides comprehensive API documentation for the Leads Management System, a platform designed to manage lead data from acquisition through processing and status transitions. The system supports retrieving lead lists, creating new leads, updating lead status, adding notes, managing files, and downloading documents. It integrates with external legacy databases and Backblaze B2 for file storage. The API is built using Next.js with Prisma ORM for database operations, and follows RESTful principles with proper authentication and error handling.

## Project Structure
The project follows a modular structure with clear separation of concerns. The main components are organized into directories such as `prisma` for database schema and migrations, `src/app/api` for API routes, `src/services` for business logic, and `src/lib` for utility functions and database access.

```mermaid
graph TB
subgraph "API Layer"
A[API Routes]
B[Middleware]
end
subgraph "Service Layer"
C[LeadStatusService]
D[LeadPoller]
E[FileUploadService]
F[NotificationService]
end
subgraph "Data Layer"
G[Prisma Client]
H[Database]
I[Backblaze B2]
end
A --> C
A --> D
A --> E
C --> G
D --> G
E --> G
G --> H
E --> I
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/route.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [prisma.ts](file://src/lib/prisma.ts)

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts)
- [schema.prisma](file://prisma/schema.prisma)

## Core Components
The core components of the Leads Management System include the Lead API endpoints, Lead Status Service for managing status transitions, Lead Poller for importing leads from legacy systems, and the Prisma data models that define the database schema. These components work together to provide a complete lead management solution with proper auditing, notifications, and integration capabilities.

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts#L1-L166)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)
- [schema.prisma](file://prisma/schema.prisma#L1-L257)

## Architecture Overview
The Leads Management System follows a layered architecture with clear separation between API endpoints, business logic services, and data access layers. The system is designed to be scalable and maintainable, with proper error handling and logging throughout.

```mermaid
graph TD
Client[Client Application] --> API[API Layer]
API --> Service[Service Layer]
Service --> Data[Data Layer]
subgraph "API Layer"
API1[/api/leads GET/]
API2[/api/leads POST/]
API3[/api/leads/[id]/status PUT/]
API4[/api/leads/[id]/files POST/]
API5[/api/leads/[id]/documents/[id]/download GET/]
end
subgraph "Service Layer"
S1[LeadStatusService]
S2[LeadPoller]
S3[FileUploadService]
S4[NotificationService]
end
subgraph "Data Layer"
D1[Prisma Client]
D2[PostgreSQL Database]
D3[Backblaze B2 Storage]
end
API1 --> S1
API2 --> S2
API3 --> S1
API4 --> S3
API5 --> D3
S1 --> D1
S2 --> D1
S3 --> D1
S3 --> D3
D1 --> D2
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/route.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [prisma.ts](file://src/lib/prisma.ts)

## Detailed Component Analysis

### Lead Data Model
The Lead data model is comprehensive, capturing both business and personal information for leads. It includes fields for contact information, business details, financial data, and system metadata.

```mermaid
erDiagram
LEAD {
int id PK
bigint legacy_lead_id UK
int campaign_id
string email
string phone
string mobile
string first_name
string last_name
string business_name
string dba
string business_address
string business_city
string business_state
string business_zip
string business_phone
string business_email
string industry
int years_in_business
string amount_needed
string monthly_revenue
string ownership_percentage
string tax_id
string state_of_inc
string date_business_started
string legal_entity
string nature_of_business
string has_existing_loans
string date_of_birth
string social_security
string personal_address
string personal_city
string personal_state
string personal_zip
string legal_name
lead_status status
string intake_token UK
datetime intake_completed_at
datetime step1_completed_at
datetime step2_completed_at
datetime created_at
datetime updated_at
datetime imported_at
}
LEAD_NOTE {
int id PK
int lead_id FK
int user_id FK
string content
datetime created_at
}
DOCUMENT {
int id PK
int lead_id FK
string filename
string original_filename
int file_size
string mime_type
string b2_file_id
string b2_bucket_name
int uploaded_by
datetime uploaded_at
}
LEAD_STATUS_HISTORY {
int id PK
int lead_id FK
lead_status previous_status
lead_status new_status
int changed_by FK
string reason
datetime created_at
}
LEAD ||--o{ LEAD_NOTE : contains
LEAD ||--o{ DOCUMENT : contains
LEAD ||--o{ LEAD_STATUS_HISTORY : has
```

**Diagram sources**
- [schema.prisma](file://prisma/schema.prisma#L58-L257)

**Section sources**
- [schema.prisma](file://prisma/schema.prisma#L58-L257)

### Lead Status Management
The Lead Status Service implements a state machine pattern to manage lead status transitions with validation rules, audit logging, and automated workflows.

```mermaid
classDiagram
class LeadStatusService {
+StatusTransitionRule[] statusTransitions
+validateStatusTransition(currentStatus, newStatus, reason) ValidationResult
+changeLeadStatus(request) StatusChangeResult
+getLeadStatusHistory(leadId) HistoryResult
+getAvailableTransitions(currentStatus) TransitionOptions
+getStatusChangeStats(days) StatsResult
}
class StatusChangeRequest {
+int leadId
+LeadStatus newStatus
+int changedBy
+string reason
}
class StatusChangeResult {
+boolean success
+Lead lead
+string error
+boolean followUpsCancelled
+boolean staffNotificationSent
}
class StatusTransitionRule {
+LeadStatus from
+LeadStatus[] to
+boolean requiresReason
+string description
}
LeadStatusService --> StatusChangeRequest : "uses"
LeadStatusService --> StatusChangeResult : "returns"
LeadStatusService --> StatusTransitionRule : "contains"
```

**Diagram sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)

**Section sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)

### Lead Status Workflow
The lead status workflow follows a defined state transition pattern with business rules governing valid transitions between states.

```mermaid
stateDiagram-v2
[*] --> NEW
NEW --> PENDING : "assign intake token"
NEW --> IN_PROGRESS : "direct assignment"
NEW --> REJECTED : "disqualify"
PENDING --> IN_PROGRESS : "documents received"
PENDING --> COMPLETED : "funded"
PENDING --> REJECTED : "decline"
IN_PROGRESS --> COMPLETED : "funded"
IN_PROGRESS --> REJECTED : "decline"
IN_PROGRESS --> PENDING : "awaiting response"
COMPLETED --> IN_PROGRESS : "reopened"
REJECTED --> PENDING : "reopened"
REJECTED --> IN_PROGRESS : "reopened"
note right of COMPLETED
Requires reason when
transitioning from COMPLETED
end note
note right of REJECTED
Requires reason when
reopening from REJECTED
end note
```

**Diagram sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)

**Section sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)

### Lead Polling Process
The Lead Poller service handles the import of leads from legacy databases, transforming and loading them into the current system with proper error handling and batching.

```mermaid
flowchart TD
Start([Start Polling]) --> Connect["Connect to Legacy DB"]
Connect --> GetLatest["Get Latest Legacy Lead ID"]
GetLatest --> Fetch["Fetch New Leads from Legacy DB"]
Fetch --> Check["Any New Leads?"]
Check --> |No| End([No New Leads])
Check --> |Yes| Batch["Create Batches"]
Batch --> Process["Process Each Batch"]
Process --> Transform["Transform Lead Data"]
Transform --> Generate["Generate Intake Token"]
Generate --> Create["Create Lead in Database"]
Create --> Schedule["Schedule Follow-ups"]
Schedule --> Next["Next Lead"]
Next --> Process
Process --> Complete["All Batches Complete"]
Complete --> Disconnect["Disconnect from Legacy DB"]
Disconnect --> End2([Polling Complete])
```

**Diagram sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)

**Section sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)

### API Endpoint Flow
The API endpoint flow demonstrates how requests are processed from authentication through to response generation.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant API as "Leads API"
participant Service as "LeadStatusService"
participant DB as "Prisma Client"
participant Logger as "Logger"
Client->>API : GET /api/leads
API->>API : withErrorHandler()
API->>API : getServerSession()
API->>API : Authentication Check
API->>Logger : Log API Request
API->>API : Parse Query Parameters
API->>API : Validate Pagination
API->>DB : findMany() with filters
API->>DB : count() for total
DB-->>API : Leads Data
DB-->>API : Total Count
API->>API : Serialize BigInt to String
API->>Logger : Log API Response
API-->>Client : JSON Response with leads and pagination
Client->>API : PUT /api/leads/[id]/status
API->>API : withErrorHandler()
API->>API : getServerSession()
API->>API : Authentication Check
API->>Service : changeLeadStatus()
Service->>DB : findUnique() current lead
DB-->>Service : Current Lead Data
Service->>Service : validateStatusTransition()
Service->>Service : validateStatusTransition()
Service->>DB : update() lead status
Service->>DB : create() status history
DB-->>Service : Updated Lead
Service->>Service : cancelFollowUpsForLead() if needed
Service->>Service : sendStaffStatusChangeNotification()
Service-->>API : StatusChangeResult
API-->>Client : JSON Response
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/route.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts#L1-L166)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)

## Dependency Analysis
The Leads Management System has a well-defined dependency structure with clear boundaries between components. The API layer depends on service classes for business logic, which in turn depend on the Prisma client for data access.

```mermaid
graph TD
A[Leads API] --> B[LeadStatusService]
A --> C[LeadPoller]
A --> D[FileUploadService]
B --> E[Prisma Client]
C --> E
D --> E
D --> F[Backblaze B2 SDK]
B --> G[FollowUpScheduler]
B --> H[NotificationService]
E --> I[PostgreSQL Database]
D --> J[Backblaze B2 Storage]
style A fill:#f9f,stroke:#333
style B fill:#bbf,stroke:#333
style C fill:#bbf,stroke:#333
style D fill:#bbf,stroke:#333
style E fill:#f96,stroke:#333
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/route.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [prisma.ts](file://src/lib/prisma.ts)

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts#L1-L166)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)

## Performance Considerations
The system includes several performance optimizations:
- **Pagination**: The GET /api/leads endpoint supports pagination with configurable page size (1-100 items) to prevent excessive data transfer.
- **Batch Processing**: The Lead Poller processes leads in batches to minimize database transactions and improve import performance.
- **Indexing**: Database queries use indexed fields for filtering and sorting operations.
- **Caching**: While not explicitly implemented in the provided code, the architecture allows for caching layers to be added for frequently accessed data.
- **Error Handling**: Database operations are wrapped in error handling functions to prevent cascading failures and provide meaningful error messages.

The system also includes comprehensive logging for monitoring performance and troubleshooting issues, with timing information captured for API requests and database operations.

## Troubleshooting Guide
Common issues and their solutions:

**Invalid Status Transitions**: When attempting to change a lead's status, ensure the transition follows the defined rules. For example, transitioning from COMPLETED or REJECTED states requires a reason. Check the error message returned by the API for specific validation failures.

**Authentication Errors**: All API endpoints require authentication. Ensure the request includes valid session credentials. The system uses NextAuth for authentication, so verify the session is active.

**Database Connection Issues**: If the Lead Poller fails to connect to the legacy database, check the connection configuration and network connectivity. The system logs detailed error messages for database operations.

**File Upload Problems**: When uploading files, ensure the request includes proper authentication and the file size is within limits. The system integrates with Backblaze B2, so verify the storage credentials are correctly configured.

**Pagination Validation**: The API validates pagination parameters. Ensure page and limit values are positive integers, with limit not exceeding 100.

**Environment Variables**: Several features depend on environment variables (e.g., MERCHANT_FUNDING_CAMPAIGN_IDS for the Lead Poller). Verify all required environment variables are set.

**Section sources**
- [route.ts](file://src/app/api/leads/route.ts#L1-L166)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L1-L455)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L521)

## Conclusion
The Leads Management System provides a comprehensive solution for managing leads through their lifecycle, from initial acquisition to final disposition. The API is well-structured with clear endpoints for retrieving lead lists, creating new leads, updating lead status, managing files, and accessing document downloads. The system implements robust business logic for status transitions with proper validation, audit logging, and notifications. The architecture is modular and maintainable, with clear separation of concerns between API endpoints, business services, and data access layers. The integration with legacy systems and cloud storage provides flexibility for real-world deployment scenarios.