# Lead Sharing API

<cite>
**Referenced Files in This Document**   
- [route.ts](file://src/app/api/leads/[id]/share/route.ts)
- [migration.sql](file://prisma/migrations/20250917154515_add_lead_share_links/migration.sql)
- [auth.ts](file://src/lib/auth.ts)
- [middleware.ts](file://src/middleware.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [errors.ts](file://src/lib/errors.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication Model](#authentication-model)
3. [Lead Sharing Endpoints](#lead-sharing-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Security Considerations](#security-considerations)
6. [Integration Patterns](#integration-patterns)
7. [Usage Examples](#usage-examples)
8. [Error Handling](#error-handling)

## Introduction
The Lead Sharing API enables secure, time-limited sharing of lead information with external parties through unique tokenized URLs. This system allows authorized users to generate shareable links for specific leads, which can be accessed without requiring authentication on the recipient's side. Each share link is cryptographically secure, expires after 7 days, and supports only one active link per lead at a time.

The API is built on Next.js with Prisma ORM and integrates with the application's authentication system to ensure only authorized users can create or manage share links. The design emphasizes security, auditability, and ease of integration.

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L157)
- [migration.sql](file://prisma/migrations/20250917154515_add_lead_share_links/migration.sql#L0-L22)

## Authentication Model
Access to the Lead Sharing API endpoints requires authentication via Next-Auth. Users must have an active session with a valid user ID to perform operations. The system leverages the application's existing authentication infrastructure, ensuring that only authenticated users with appropriate permissions can generate or manage share links.

The middleware enforces role-based access control, though the share endpoints are accessible to all authenticated users. The authentication token contains user role information that can be used for future access control enhancements.

```mermaid
sequenceDiagram
participant Client
participant API
participant Auth
participant Database
Client->>API : POST /api/leads/{id}/share
API->>Auth : getServerSession()
Auth-->>API : Session with user ID
API->>Database : Verify lead access
Database-->>API : Lead data
API->>API : Generate secure token
API->>Database : Store share link
Database-->>API : Confirmation
API-->>Client : Share URL
```

**Diagram sources**
- [auth.ts](file://src/lib/auth.ts#L0-L50)
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L49)
- [middleware.ts](file://src/middleware.ts#L127-L167)

## Lead Sharing Endpoints
The Lead Sharing API provides RESTful endpoints for creating, retrieving, and revoking share links for leads.

### POST /api/leads/{id}/share
Creates a new share link for a specific lead. If an active share link already exists for the lead, it is automatically deactivated before creating the new one.

### GET /api/leads/{id}/share
Retrieves all active share links for a specific lead, including metadata such as creation time, expiration, access count, and the user who created the link.

### DELETE /api/leads/{id}/share
Revokes all active share links for a specific lead by setting their active status to false.

```mermaid
flowchart TD
A[Client Request] --> B{Valid Session?}
B --> |No| C[Return 401 Unauthorized]
B --> |Yes| D{Valid Lead ID?}
D --> |No| E[Return 400 Bad Request]
D --> |Yes| F{Lead Exists?}
F --> |No| G[Return 404 Not Found]
F --> |Yes| H[Process Request]
H --> I[Create/Retrieve/Delete Share Link]
I --> J[Return JSON Response]
```

**Diagram sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L157)

## Request/Response Formats
### Create Share Link (POST)
**Request**
- Method: POST
- Path: `/api/leads/{id}/share`
- Headers: `Authorization: Bearer <token>`
- Path Parameter: `id` (integer, lead identifier)

**Response (Success)**
```json
{
  "success": true,
  "shareLink": {
    "id": 123,
    "token": "a1b2c3d4e5f6...",
    "url": "https://app.example.com/share/a1b2c3d4e5f6...",
    "expiresAt": "2025-09-24T15:30:00Z",
    "createdAt": "2025-09-17T15:30:00Z"
  }
}
```

### List Share Links (GET)
**Response (Success)**
```json
{
  "success": true,
  "shareLinks": [
    {
      "id": 123,
      "token": "a1b2c3d4e5f6...",
      "url": "https://app.example.com/share/a1b2c3d4e5f6...",
      "expiresAt": "2025-09-24T15:30:00Z",
      "createdAt": "2025-09-17T15:30:00Z",
      "accessCount": 5,
      "accessedAt": "2025-09-18T10:20:00Z",
      "createdBy": "user@example.com"
    }
  ]
}
```

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L51-L100)
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L98-L157)

## Security Considerations
The Lead Sharing API implements multiple security measures to protect sensitive lead information:

1. **Authentication Enforcement**: All endpoints require an authenticated session with a valid user ID.
2. **Secure Token Generation**: Share tokens are generated using Node.js `crypto.randomBytes()` with 32 bytes of entropy, providing 256 bits of randomness.
3. **Automatic Expiration**: All share links expire after 7 days from creation.
4. **Single Active Link**: Only one active share link can exist per lead at any time; creating a new link automatically deactivates existing ones.
5. **HTTPS Enforcement**: In production, the application enforces HTTPS through HSTS headers.
6. **Rate Limiting**: The middleware implements rate limiting to prevent abuse (100 requests per 15 minutes per IP).
7. **Audit Trail**: All share link creations are recorded with the creating user's ID and timestamp.

The system follows the principle of least privilege, ensuring that users can only share leads they have access to, and recipients can only view the specific lead data through the share link.

```mermaid
erDiagram
lead_share_links {
integer id PK
integer lead_id FK
string token
integer created_by FK
datetime expires_at
datetime accessed_at
integer access_count
boolean is_active
datetime created_at
}
leads ||--o{ lead_share_links : "has"
users ||--o{ lead_share_links : "creates"
lead_share_links }|--|| leads : "references"
lead_share_links }|--|| users : "created by"
```

**Diagram sources**
- [migration.sql](file://prisma/migrations/20250917154515_add_lead_share_links/migration.sql#L0-L22)
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L49)

## Integration Patterns
The Lead Sharing API supports several integration patterns for different use cases:

### Internal Collaboration
Team members can share leads with colleagues who may not have direct access to the system, using the generated URL to provide temporary access.

### External Partner Sharing
Sales representatives can share lead information with external partners or affiliates without granting them system access.

### Automated Workflows
The API can be integrated into automated workflows where lead information needs to be shared programmatically, such as with CRM systems or marketing platforms.

### Audit and Compliance
The system maintains a complete audit trail of all share link activities, supporting compliance requirements by tracking who shared what and when.

The API is designed to be idempotent for creation operations—creating a new share link for a lead automatically handles cleanup of previous links, simplifying client implementation.

**Section sources**
- [TokenService.ts](file://src/services/TokenService.ts#L146-L184)
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L157)

## Usage Examples
### Creating a Share Link
```bash
curl -X POST https://api.example.com/api/leads/123/share \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

### Retrieving Active Share Links
```bash
curl -X GET https://api.example.com/api/leads/123/share \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Revoking Share Links
```bash
curl -X DELETE https://api.example.com/api/leads/123/share \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript Integration
```javascript
async function createShareLink(leadId) {
  const response = await fetch(`/api/leads/${leadId}/share`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('Share URL:', data.shareLink.url);
    return data.shareLink;
  } else {
    throw new Error('Failed to create share link');
  }
}
```

**Section sources**
- [route.ts](file://src/app/api/leads/[id]/share/route.ts#L0-L157)

## Error Handling
The API implements comprehensive error handling with standardized responses:

| Status Code | Error Type | Description |
|-----------|-----------|-------------|
| 401 | Unauthorized | No valid session or missing authentication |
| 400 | Bad Request | Invalid lead ID format |
| 404 | Not Found | Lead does not exist |
| 500 | Internal Server Error | Server-side failure during processing |

All errors are handled through the centralized `withErrorHandler` middleware, which ensures consistent response formatting and proper logging. Operational errors are distinguished from non-operational errors, with appropriate logging levels.

The error handling system captures request IDs for tracing and includes contextual information in logs while maintaining security by not exposing sensitive details in client responses.

```mermaid
flowchart TD
A[API Request] --> B[Error Occurs?]
B --> |No| C[Return Success]
B --> |Yes| D{Error Type}
D --> |AppError| E[Log as Warning]
D --> |Other Error| F[Log as Error]
E --> G[Return Client-Safe Message]
F --> G
G --> H[Standardized JSON Response]
```

**Section sources**
- [errors.ts](file://src/lib/errors.ts#L0-L47)
- [errors.ts](file://src/lib/errors.ts#L196-L249)