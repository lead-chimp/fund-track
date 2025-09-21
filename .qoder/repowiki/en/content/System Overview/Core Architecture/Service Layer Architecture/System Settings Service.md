# System Settings Service

<cite>
**Referenced Files in This Document**   
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts)
- [system-settings.ts](file://prisma/seeds/system-settings.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [page.tsx](file://src/app/admin/settings/page.tsx)
- [SettingsCard.tsx](file://src/components/admin/SettingsCard.tsx)
- [SettingInput.tsx](file://src/components/admin/SettingInput.tsx)
- [SettingsAuditLog.tsx](file://src/components/admin/SettingsAuditLog.tsx)
- [route.ts](file://src/app/api/admin/settings/route.ts)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts)
- [route.ts](file://src/app/api/admin/settings/audit/route.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Data Model and Schema](#data-model-and-schema)
4. [Caching Mechanism](#caching-mechanism)
5. [Type-Safe Access and Value Handling](#type-safe-access-and-value-handling)
6. [Validation and Business Rules](#validation-and-business-rules)
7. [Runtime Updates and Audit Logging](#runtime-updates-and-audit-logging)
8. [API Integration](#api-integration)
9. [Admin Interface](#admin-interface)
10. [Initialization and Dependencies](#initialization-and-dependencies)

## Introduction
The SystemSettingsService provides a centralized, type-safe mechanism for managing application-wide configuration settings. It enables dynamic configuration of system behavior without requiring code changes or restarts. The service supports multiple setting types (boolean, string, number, JSON), enforces validation rules, maintains audit trails, and provides efficient cached access to settings. This document details the architecture, functionality, and integration points of the SystemSettingsService.

## Core Architecture
The SystemSettingsService implements a singleton pattern to provide global access to system settings. It abstracts direct database access with a service layer that handles caching, type conversion, validation, and audit logging. The service interacts with the SystemSetting model via Prisma ORM and exposes methods for retrieving, updating, and managing settings.

```mermaid
classDiagram
class SystemSettingsService {
+getSetting(key, type) Promise~T~
+getSettingWithDefault(key, type, fallback) Promise~T~
+getSettingRaw(key) Promise~SystemSetting | null~
+getSettingsByCategory(category) Promise~SystemSetting[]~
+getAllSettings() Promise~SystemSetting[]~
+updateSetting(key, value, updatedBy) Promise~SystemSetting~
+updateSettings(updates, updatedBy) Promise~SystemSetting[]~
+resetSetting(key, updatedBy) Promise~SystemSetting~
+resetCategorySettings(category, updatedBy) Promise~SystemSetting[]~
+getSettingsAuditTrail(limit) Promise~SystemSetting[]~
-validateSettingValue(value, type) void
-parseSettingValue(value, type) T
-refreshCacheIfNeeded() Promise~void~
-refreshCache() Promise~void~
-cache : SettingsCache
}
class SystemSetting {
+id : number
+key : string
+value : string
+type : SystemSettingType
+category : SystemSettingCategory
+description : string
+defaultValue : string
+updatedBy : number | null
+createdAt : Date
+updatedAt : Date
}
class SystemSettingType {
+BOOLEAN
+STRING
+NUMBER
+JSON
}
class SystemSettingCategory {
+NOTIFICATIONS
+CONNECTIVITY
}
SystemSettingsService --> SystemSetting : "manages"
SystemSettingsService --> SystemSettingType : "uses"
SystemSettingsService --> SystemSettingCategory : "uses"
```

**Diagram sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L1-L352)
- [schema.prisma](file://prisma/schema.prisma#L175-L188)

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L1-L352)

## Data Model and Schema
The SystemSetting model defines the structure for storing configurable application settings. Each setting has a unique key, value, type, category, description, default value, and audit fields. The schema supports four data types (boolean, string, number, JSON) and organizes settings into categories for easier management.

```mermaid
erDiagram
SYSTEM_SETTING {
Int id PK
String key UK
String value
SystemSettingType type
SystemSettingCategory category
String description
String default_value
Int updated_by FK
DateTime created_at
DateTime updated_at
}
USER {
Int id PK
String email
UserRole role
DateTime created_at
DateTime updated_at
}
SYSTEM_SETTING ||--o{ USER : "updated_by"
```

**Diagram sources**
- [schema.prisma](file://prisma/schema.prisma#L175-L188)
- [schema.prisma](file://prisma/schema.prisma#L58-L73)

**Section sources**
- [schema.prisma](file://prisma/schema.prisma#L175-L188)
- [system-settings.ts](file://prisma/seeds/system-settings.ts#L1-L74)

## Caching Mechanism
The SystemSettingsService implements an in-memory cache with a 5-minute TTL (Time To Live) to optimize performance and reduce database load. The cache stores all settings in a Map keyed by setting key, with automatic refresh when the TTL expires or when the cache is empty.

```mermaid
flowchart TD
Start([Get Setting]) --> CheckCache["Check Cache Validity"]
CheckCache --> CacheValid{"Cache Valid?"}
CacheValid --> |Yes| ReturnFromCache["Return Setting from Cache"]
CacheValid --> |No| RefreshCache["Refresh Cache from Database"]
RefreshCache --> LoadAll["Load All Settings"]
LoadAll --> PopulateCache["Populate Cache Map"]
PopulateCache --> UpdateTimestamp["Update Last Updated"]
UpdateTimestamp --> ReturnFromCache
ReturnFromCache --> End([Return Setting])
UpdateSetting --> InvalidateCache["Mark Cache as Stale"]
InvalidateCache --> NextRead["Next Read Triggers Refresh"]
style Start fill:#4CAF50,stroke:#388E3C
style End fill:#4CAF50,stroke:#388E3C
```

**Diagram sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L291-L349)

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L291-L349)

## Type-Safe Access and Value Handling
The service provides type-safe access to settings through generic methods that ensure correct type conversion. Settings are stored as strings in the database but are automatically converted to their proper types (boolean, number, JSON) when retrieved. The service also provides convenience methods with default value fallbacks.

```mermaid
sequenceDiagram
participant Client
participant Service
participant Cache
participant DB
Client->>Service : getSetting("sms_notifications_enabled", "boolean")
Service->>Cache : refreshCacheIfNeeded()
Cache->>Cache : TTL Expired? Size=0?
Cache-->>Service : Yes
Service->>DB : findMany()
DB-->>Service : All Settings
Service->>Cache : Update Cache Map
Service->>Service : getSettingRaw("sms_notifications_enabled")
Service->>Service : parseSettingValue(value, "boolean")
Service-->>Client : true/false
Note over Client,DB : Type-safe setting retrieval with automatic parsing
```

**Diagram sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L49-L105)
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L241-L289)

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L49-L105)
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L241-L289)

## Validation and Business Rules
The SystemSettingsService enforces strict validation rules to ensure data integrity. When updating settings, the service validates that the new value matches the expected type format (boolean values must be "true"/"false", numbers must be valid, JSON must be parseable). The service also validates that referenced users exist when tracking who made changes.

```mermaid
flowchart TD
Start([Update Setting]) --> ValidateExists["Setting Exists?"]
ValidateExists --> |No| Error1["Throw: Setting Not Found"]
ValidateExists --> |Yes| ValidateType["Validate Value Type"]
ValidateType --> |Boolean| CheckBoolean["Value = 'true'/'false'?"]
ValidateType --> |Number| CheckNumber["Is Valid Number?"]
ValidateType --> |JSON| CheckJSON["Is Valid JSON?"]
ValidateType --> |String| Valid["Always Valid"]
CheckBoolean --> |No| Error2["Throw: Invalid Boolean"]
CheckNumber --> |No| Error3["Throw: Invalid Number"]
CheckJSON --> |No| Error4["Throw: Invalid JSON"]
CheckBoolean --> |Yes| ValidateUser["User Exists?"]
CheckNumber --> |Yes| ValidateUser
CheckJSON --> |Yes| ValidateUser
Valid --> ValidateUser
ValidateUser --> |No| Warning["Log Warning, Set updatedBy=null"]
ValidateUser --> |Yes| UpdateDB["Update Database"]
Warning --> UpdateDB
UpdateDB --> UpdateCache["Update Cache"]
UpdateCache --> Return["Return Updated Setting"]
style Error1 fill:#f44336,stroke:#d32f2f
style Error2 fill:#f44336,stroke:#d32f2f
style Error3 fill:#f44336,stroke:#d32f2f
style Error4 fill:#f44336,stroke:#d32f2f
style Warning fill:#ff9800,stroke:#f57c00
```

**Diagram sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L107-L202)

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L107-L202)

## Runtime Updates and Audit Logging
The service supports runtime updates to settings through individual and bulk update methods. All changes are automatically audited, with the audit trail accessible through the getSettingsAuditTrail method. The service also provides reset functionality to restore settings to their default values.

```mermaid
sequenceDiagram
participant AdminUI
participant API
participant Service
participant DB
AdminUI->>API : PUT /api/admin/settings/sms_notifications_enabled
API->>API : Authenticate Admin
API->>Service : updateSetting("sms_notifications_enabled", "false", userId)
Service->>Service : validateSettingExists()
Service->>Service : validateValueFormat()
Service->>Service : validateUserExists()
Service->>DB : update setting in database
DB-->>Service : updated setting
Service->>Service : update cache
Service-->>API : return updated setting
API-->>AdminUI : {message, setting}
AdminUI->>API : POST /api/admin/settings/sms_notifications_enabled
API->>API : Authenticate Admin
API->>Service : resetSetting("sms_notifications_enabled", userId)
Service->>Service : getSettingRaw()
Service->>Service : updateSetting(key, defaultValue, userId)
Service-->>API : return reset setting
API-->>AdminUI : {message, setting}
AdminUI->>API : GET /api/admin/settings/audit
API->>API : Authenticate Admin
API->>Service : getSettingsAuditTrail(50)
Service->>DB : findMany() with orderBy updatedAt desc
DB-->>Service : audit trail data
Service-->>API : return audit trail
API-->>AdminUI : display audit log
```

**Diagram sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L107-L202)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L50-L129)
- [route.ts](file://src/app/api/admin/settings/audit/route.ts#L1-L33)

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L107-L202)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L50-L129)
- [route.ts](file://src/app/api/admin/settings/audit/route.ts#L1-L33)

## API Integration
The SystemSettingsService is exposed through a RESTful API with endpoints for retrieving, updating, and auditing settings. The API enforces admin authentication and provides both individual setting operations and bulk operations for efficiency.

```mermaid
graph TB
subgraph "Frontend"
UI[Admin Settings Page]
SettingsCard[SettingsCard Component]
SettingsAuditLog[SettingsAuditLog Component]
end
subgraph "API Layer"
SettingsRoute[/api/admin/settings]
SettingRoute[/api/admin/settings/{key}]
AuditRoute[/api/admin/settings/audit]
end
subgraph "Service Layer"
Service[SystemSettingsService]
end
subgraph "Data Layer"
DB[(Database)]
Prisma[Prisma ORM]
end
UI --> SettingsCard
UI --> SettingsAuditLog
SettingsCard --> SettingRoute
SettingsCard --> SettingsRoute
SettingsAuditLog --> AuditRoute
SettingRoute --> Service
SettingsRoute --> Service
AuditRoute --> Service
Service --> Prisma
Prisma --> DB
style UI fill:#2196F3,stroke:#1976D2
style Service fill:#4CAF50,stroke:#388E3C
style DB fill:#F44336,stroke:#D32F2F
```

**Diagram sources**
- [route.ts](file://src/app/api/admin/settings/route.ts#L1-L107)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L1-L130)
- [route.ts](file://src/app/api/admin/settings/audit/route.ts#L1-L33)
- [page.tsx](file://src/app/admin/settings/page.tsx#L1-L265)

**Section sources**
- [route.ts](file://src/app/api/admin/settings/route.ts#L1-L107)
- [route.ts](file://src/app/api/admin/settings/[key]/route.ts#L1-L130)
- [route.ts](file://src/app/api/admin/settings/audit/route.ts#L1-L33)

## Admin Interface
The admin interface provides a user-friendly way to manage system settings through the SettingsCard component. The interface displays settings by category, allows inline editing, provides reset functionality, and includes an audit log viewer. Different input types are rendered based on the setting type (toggle for booleans, text input for strings, etc.).

```mermaid
flowchart TD
A[Admin Settings Page] --> B[Tab Navigation]
B --> C[Notifications Category]
B --> D[Connectivity Category]
C --> E[SettingsCard]
E --> F[Setting 1: sms_notifications_enabled]
F --> G[Toggle Input]
F --> H[Reset Button]
F --> I[Default Value Display]
E --> J[Setting 2: notification_retry_attempts]
J --> K[Number Input]
J --> L[Reset Button]
A --> M[Audit Log Toggle]
M --> |Show| N[SettingsAuditLog]
N --> O[Table of Recent Changes]
O --> P[Setting Name]
O --> Q[Old Value]
O --> R[Changed By]
O --> S[Date/Time]
style A fill:#2196F3,stroke:#1976D2
style E fill:#2196F3,stroke:#1976D2
style N fill:#2196F3,stroke:#1976D2
```

**Diagram sources**
- [page.tsx](file://src/app/admin/settings/page.tsx#L1-L265)
- [SettingsCard.tsx](file://src/components/admin/SettingsCard.tsx#L1-L140)
- [SettingInput.tsx](file://src/components/admin/SettingInput.tsx#L1-L165)
- [SettingsAuditLog.tsx](file://src/components/admin/SettingsAuditLog.tsx#L1-L136)

**Section sources**
- [page.tsx](file://src/app/admin/settings/page.tsx#L1-L265)
- [SettingsCard.tsx](file://src/components/admin/SettingsCard.tsx#L1-L140)
- [SettingInput.tsx](file://src/components/admin/SettingInput.tsx#L1-L165)

## Initialization and Dependencies
The SystemSettingsService is initialized as a singleton instance, making it globally available throughout the application. It depends on Prisma for database access and is integrated with the authentication system to track who makes changes. The service is seeded with default values during database initialization.

**Section sources**
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L349-L352)
- [system-settings.ts](file://prisma/seeds/system-settings.ts#L1-L74)
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L1-L352)