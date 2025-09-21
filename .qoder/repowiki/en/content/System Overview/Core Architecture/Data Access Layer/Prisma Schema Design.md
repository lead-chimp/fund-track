# Prisma Schema Design

<cite>
**Referenced Files in This Document**   
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)
- [prisma/seed.ts](file://prisma/seed.ts#L1-L511)
- [prisma/seeds/system-settings.ts](file://prisma/seeds/system-settings.ts#L1-L74)
- [src/services/LeadStatusService.ts](file://src/services/LeadStatusService.ts#L21-L455)
- [src/services/NotificationService.ts](file://src/services/NotificationService.ts#L448-L471)
- [src/services/SystemSettingsService.ts](file://src/services/SystemSettingsService.ts#L49-L289)
- [src/app/admin/settings/page.tsx](file://src/app/admin/settings/page.tsx#L88-L263)
- [src/components/admin/SettingsCard.tsx](file://src/components/admin/SettingsCard.tsx#L45-L80)
- [prisma/migrations/20250826203101_change_amount_and_revenue_to_string/migration.sql](file://prisma/migrations/20250826203101_change_amount_and_revenue_to_string/migration.sql#L1-L2)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Data Models Overview](#data-models-overview)
3. [Lead Model](#lead-model)
4. [User Model](#user-model)
5. [NotificationLog Model](#notificationlog-model)
6. [FollowupQueue Model](#followupqueue-model)
7. [SystemSetting Model](#systemsetting-model)
8. [Document Model](#document-model)
9. [Enums and Their Usage](#enums-and-their-usage)
10. [Model Relationships](#model-relationships)
11. [Business Rules and Constraints](#business-rules-and-constraints)
12. [Query Patterns and Prisma Client Usage](#query-patterns-and-prisma-client-usage)
13. [Indexing and Performance Optimization](#indexing-and-performance-optimization)
14. [Schema Evolution and Migrations](#schema-evolution-and-migrations)
15. [Textual Entity-Relationship Diagram](#textual-entity-relationship-diagram)

## Introduction
This document provides comprehensive documentation for the Prisma schema of the fund-track application. It details the data models, relationships, constraints, and business rules implemented in the system. The schema supports a lead management platform for merchant funding, tracking leads from intake through processing and funding decisions. The documentation covers field types, primary keys, foreign key relationships, enum usage, and critical business logic enforced at the database level. It also explains how the schema has evolved through migrations and the implications of recent changes such as converting monetary fields to strings.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)

## Data Models Overview
The Prisma schema defines seven core models that form the foundation of the fund-track application: User, Lead, LeadNote, Document, FollowupQueue, NotificationLog, and SystemSetting. These models are interconnected through various relationships to support the application's business logic. The schema uses PostgreSQL as the underlying database and leverages Prisma's type system to define field types, constraints, and relationships. Each model includes timestamps for creation and updates, and several models use the `@map` attribute to map field names to snake_case database columns. The schema also defines multiple enums to standardize values for fields like user roles, lead statuses, notification types, and system setting categories.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)

## Lead Model
The Lead model represents a potential customer in the merchant funding process. It contains comprehensive information about both the individual and their business, including contact details, business information, financial data, and personal information.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **legacyLeadId**: BigInt @unique @map("legacy_lead_id") - Unique identifier from the legacy system
- **campaignId**: Int @map("campaign_id") - Identifier for the marketing campaign that generated the lead
- **email**: String? - Personal email address of the lead
- **phone**: String? - Personal phone number
- **firstName**: String? @map("first_name") - First name of the lead
- **lastName**: String? @map("last_name") - Last name of the lead
- **businessName**: String? @map("business_name") - Legal name of the business
- **dba**: String? - "Doing Business As" name
- **businessAddress**: String? @map("business_address") - Business physical address
- **businessPhone**: String? @map("business_phone") - Business phone number
- **businessEmail**: String? @map("business_email") - Business email address
- **mobile**: String? @map("mobile") - Mobile phone number
- **businessCity**: String? @map("business_city") - City where business operates
- **businessState**: String? @map("business_state") - State where business operates
- **businessZip**: String? @map("business_zip") - ZIP code for business address
- **industry**: String? - Industry classification
- **yearsInBusiness**: Int? @map("years_in_business") - Number of years business has been operating
- **amountNeeded**: String? @map("amount_needed") - Funding amount requested (stored as string)
- **monthlyRevenue**: String? @map("monthly_revenue") - Monthly gross revenue (stored as string)
- **ownershipPercentage**: String? @map("ownership_percentage") - Percentage of business ownership
- **taxId**: String? @map("tax_id") - Tax identification number
- **stateOfInc**: String? @map("state_of_inc") - State of incorporation
- **dateBusinessStarted**: String? @map("date_business_started") - Date business was established
- **legalEntity**: String? @map("legal_entity") - Legal entity type (LLC, Corporation, etc.)
- **natureOfBusiness**: String? @map("nature_of_business") - Description of business activities
- **hasExistingLoans**: String? @map("has_existing_loans") - Indicates if business has existing loans
- **dateOfBirth**: String? @map("date_of_birth") - Date of birth of the lead
- **socialSecurity**: String? @map("social_security") - Social Security number
- **personalAddress**: String? @map("personal_address") - Personal residential address
- **personalCity**: String? @map("personal_city") - City of personal residence
- **personalState**: String? @map("personal_state") - State of personal residence
- **personalZip**: String? @map("personal_zip") - ZIP code for personal address
- **legalName**: String? @map("legal_name") - Full legal name
- **status**: LeadStatus @default(NEW) - Current status of the lead
- **intakeToken**: String? @unique @map("intake_token") - Unique token for intake process
- **intakeCompletedAt**: DateTime? @map("intake_completed_at") - Timestamp when intake was completed
- **step1CompletedAt**: DateTime? @map("step1_completed_at") - Timestamp when step 1 was completed
- **step2CompletedAt**: DateTime? @map("step2_completed_at") - Timestamp when step 2 was completed
- **createdAt**: DateTime @default(now()) @map("created_at") - Creation timestamp
- **updatedAt**: DateTime @updatedAt @map("updated_at") - Last update timestamp
- **importedAt**: DateTime @default(now()) @map("imported_at") - Timestamp when lead was imported

### Constraints and Indexes
The Lead model has several constraints to ensure data integrity:
- `legacyLeadId` has a unique constraint to prevent duplicate leads from the legacy system
- `intakeToken` has a unique constraint to ensure each intake process is uniquely identifiable
- The model uses the `@@map("leads")` directive to map to the "leads" table in the database

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L29-L145)

## User Model
The User model represents staff members who interact with the system. It stores authentication information and role-based access control data.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **email**: String @unique - Unique email address used for login
- **passwordHash**: String @map("password_hash") - Hashed password for authentication
- **role**: UserRole @default(USER) - Role determining user permissions
- **createdAt**: DateTime @default(now()) @map("created_at") - Creation timestamp
- **updatedAt**: DateTime @updatedAt @map("updated_at") - Last update timestamp

### Relations
The User model has several relationships with other models:
- `leadNotes`: LeadNote[] - Notes created by the user on leads
- `documents`: Document[] - Documents uploaded by the user
- `statusChanges`: LeadStatusHistory[] - Status changes made by the user
- `systemSettings`: SystemSetting[] - System settings updated by the user

### Constraints and Indexes
The User model has the following constraints:
- `email` has a unique constraint to prevent duplicate accounts
- The model uses the `@@map("users")` directive to map to the "users" table in the database

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L15-L27)

## NotificationLog Model
The NotificationLog model tracks all notifications sent to leads, including emails and SMS messages.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **leadId**: Int? @map("lead_id") - Foreign key to the Lead model
- **type**: NotificationType - Type of notification (EMAIL or SMS)
- **recipient**: String - Email address or phone number of recipient
- **subject**: String? - Subject line for email notifications
- **content**: String? - Body content of the notification
- **status**: NotificationStatus @default(PENDING) - Current status of the notification
- **externalId**: String? @map("external_id") - Identifier from external service (Mailgun, Twilio)
- **errorMessage**: String? @map("error_message") - Error message if notification failed
- **sentAt**: DateTime? @map("sent_at") - Timestamp when notification was sent
- **createdAt**: DateTime @default(now()) @map("created_at") - Creation timestamp

### Relations
The NotificationLog model has a relationship with the Lead model:
- `lead`: Lead? @relation(fields: [leadId], references: [id]) - Optional relationship to the lead

### Constraints and Indexes
The NotificationLog model uses the `@@map("notification_log")` directive to map to the "notification_log" table in the database. It has an index on `created_at DESC, id DESC` to optimize cursor-based pagination for recent notifications.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L188-L208)
- [prisma/migrations/20250812120000_add_notification_log_indexes/migration.sql](file://prisma/migrations/20250812120000_add_notification_log_indexes/migration.sql#L1-L10)

## FollowupQueue Model
The FollowupQueue model manages scheduled follow-up actions for leads.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **leadId**: Int @map("lead_id") - Foreign key to the Lead model
- **scheduledAt**: DateTime @map("scheduled_at") - Timestamp when follow-up is scheduled
- **followupType**: FollowupType @map("followup_type") - Type of follow-up (3h, 9h, 24h, 72h)
- **status**: FollowupStatus @default(PENDING) - Current status of the follow-up
- **sentAt**: DateTime? @map("sent_at") - Timestamp when follow-up was sent
- **createdAt**: DateTime @default(now()) @map("created_at") - Creation timestamp

### Relations
The FollowupQueue model has a relationship with the Lead model:
- `lead`: Lead @relation(fields: [leadId], references: [id], onDelete: Cascade) - Relationship to the lead with cascade delete

### Constraints and Indexes
The FollowupQueue model uses the `@@map("followup_queue")` directive to map to the "followup_queue" table in the database. The cascade delete constraint ensures that follow-up queue entries are automatically removed when a lead is deleted.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L174-L186)

## SystemSetting Model
The SystemSetting model stores configurable application settings that can be modified without code changes.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **key**: String @unique - Unique identifier for the setting
- **value**: String - Current value of the setting
- **type**: SystemSettingType - Data type of the setting (BOOLEAN, STRING, NUMBER, JSON)
- **category**: SystemSettingCategory - Category grouping settings (NOTIFICATIONS, CONNECTIVITY)
- **description**: String - Description of the setting's purpose
- **defaultValue**: String @map("default_value") - Default value if setting is reset
- **updatedBy**: Int? @map("updated_by") - Foreign key to User who last updated the setting
- **createdAt**: DateTime @default(now()) @map("created_at") - Creation timestamp
- **updatedAt**: DateTime @updatedAt @map("updated_at") - Last update timestamp

### Relations
The SystemSetting model has a relationship with the User model:
- `user`: User? @relation(fields: [updatedBy], references: [id]) - Optional relationship to the user who last updated the setting

### Constraints and Indexes
The SystemSetting model has a unique constraint on the `key` field to prevent duplicate settings. It uses the `@@map("system_settings")` directive to map to the "system_settings" table in the database.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L210-L226)

## Document Model
The Document model tracks files uploaded by or for leads, with integration to Backblaze B2 for cloud storage.

### Field Definitions
- **id**: Int @id @default(autoincrement()) - Primary key, auto-incrementing integer
- **leadId**: Int @map("lead_id") - Foreign key to the Lead model
- **filename**: String - Internal filename in storage system
- **originalFilename**: String @map("original_filename") - Original filename when uploaded
- **fileSize**: Int @map("file_size") - Size of file in bytes
- **mimeType**: String @map("mime_type") - MIME type of the file
- **b2FileId**: String @map("b2_file_id") - File identifier in Backblaze B2
- **b2BucketName**: String @map("b2_bucket_name") - Bucket name in Backblaze B2
- **uploadedBy**: Int? @map("uploaded_by") - Foreign key to User who uploaded the file
- **uploadedAt**: DateTime @default(now()) @map("uploaded_at") - Timestamp when file was uploaded

### Relations
The Document model has relationships with two models:
- `lead`: Lead @relation(fields: [leadId], references: [id], onDelete: Cascade) - Relationship to the lead with cascade delete
- `user`: User? @relation(fields: [uploadedBy], references: [id]) - Optional relationship to the user who uploaded the file

### Constraints and Indexes
The Document model uses the `@@map("documents")` directive to map to the "documents" table in the database. The cascade delete constraint ensures that documents are automatically removed when a lead is deleted.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L156-L172)

## Enums and Their Usage
The Prisma schema defines several enums to standardize values across the application, ensuring data consistency and enabling type-safe operations.

### UserRole
```prisma
enum UserRole {
  ADMIN @map("admin")
  USER  @map("user")
}
```
This enum defines user roles for access control. ADMIN users have full access to all features, while USER roles have limited permissions. The `@map` directive ensures the values are stored as "admin" and "user" in the database.

### LeadStatus
```prisma
enum LeadStatus {
  NEW         @map("new")
  PENDING     @map("pending")
  IN_PROGRESS @map("in_progress")
  COMPLETED   @map("completed")
  REJECTED    @map("rejected")
}
```
This enum tracks the lifecycle of a lead through the funding process. The application enforces business rules about valid status transitions through the LeadStatusService, which defines which status changes are allowed and whether they require a reason.

### FollowupType
```prisma
enum FollowupType {
  THREE_HOUR    @map("3h")
  NINE_HOUR     @map("9h")
  TWENTY_FOUR_H @map("24h")
  SEVENTY_TWO_H @map("72h")
}
```
This enum defines the types of automated follow-ups sent to leads at specific intervals after initial contact. These follow-ups are managed by the FollowUpScheduler service.

### FollowupStatus
```prisma
enum FollowupStatus {
  PENDING   @map("pending")
  SENT      @map("sent")
  CANCELLED @map("cancelled")
}
```
This enum tracks the status of follow-up actions, allowing the system to manage which follow-ups have been sent and which are still pending.

### NotificationType
```prisma
enum NotificationType {
  EMAIL @map("email")
  SMS   @map("sms")
}
```
This enum distinguishes between email and SMS notifications, enabling different processing logic for each type.

### NotificationStatus
```prisma
enum NotificationStatus {
  PENDING @map("pending")
  SENT    @map("sent")
  FAILED  @map("failed")
}
```
This enum tracks the delivery status of notifications, allowing the system to retry failed notifications and monitor delivery success rates.

### SystemSettingType
```prisma
enum SystemSettingType {
  BOOLEAN @map("boolean")
  STRING  @map("string")
  NUMBER  @map("number")
  JSON    @map("json")
}
```
This enum defines the data types for system settings, enabling proper validation and parsing when settings are retrieved.

### SystemSettingCategory
```prisma
enum SystemSettingCategory {
  NOTIFICATIONS    @map("notifications")
  CONNECTIVITY     @map("connectivity")
}
```
This enum categorizes system settings for organizational purposes in the admin interface, allowing settings to be grouped and displayed by category.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L228-L257)

## Model Relationships
The Prisma schema defines several relationships between models to represent the business domain accurately.

### One-to-Many Relationships
The most common relationship pattern in the schema is one-to-many, where one record in a parent model is associated with multiple records in a child model.

**Lead to Document**: A lead can have multiple documents uploaded for verification. This relationship is implemented with a foreign key `leadId` in the Document model that references the `id` field in the Lead model. The relationship includes `onDelete: Cascade`, meaning that when a lead is deleted, all associated documents are automatically deleted.

**Lead to NotificationLog**: A lead can have multiple notification logs tracking communications. This relationship is implemented with a foreign key `leadId` in the NotificationLog model that references the `id` field in the Lead model. The relationship is optional (using `Lead?`), allowing notification logs to exist without an associated lead (e.g., for system notifications).

**Lead to FollowupQueue**: A lead can have multiple follow-up actions scheduled. This relationship is implemented with a foreign key `leadId` in the FollowupQueue model that references the `id` field in the Lead model. The relationship includes `onDelete: Cascade`.

**User to Document**: A user can upload multiple documents. This relationship is implemented with a foreign key `uploadedBy` in the Document model that references the `id` field in the User model. The relationship is optional (using `User?`), allowing documents to be uploaded by the system or through automated processes without a specific user.

**User to SystemSetting**: A user can update multiple system settings. This relationship is implemented with a foreign key `updatedBy` in the SystemSetting model that references the `id` field in the User model. The relationship is optional (using `User?`), allowing settings to be updated programmatically.

### Many-to-One Relationships
These are the inverse of one-to-many relationships and are automatically created by Prisma based on the foreign key definitions.

**Document to Lead**: Each document belongs to one lead. This relationship is navigable from the Document model to the Lead model using the `lead` field.

**NotificationLog to Lead**: Each notification log belongs to zero or one lead. This relationship is navigable from the NotificationLog model to the Lead model using the `lead` field.

**FollowupQueue to Lead**: Each follow-up queue entry belongs to one lead. This relationship is navigable from the FollowupQueue model to the Lead model using the `lead` field.

**Document to User**: Each document is uploaded by zero or one user. This relationship is navigable from the Document model to the User model using the `user` field.

**SystemSetting to User**: Each system setting is updated by zero or one user. This relationship is navigable from the SystemSetting model to the User model using the `user` field.

### Implementation Details
All relationships use Prisma's `@relation` attribute to explicitly define the foreign key fields and referenced fields. Most relationships that represent ownership (e.g., documents belonging to a lead) include `onDelete: Cascade` to maintain referential integrity and automatically clean up related records when a parent record is deleted.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)

## Business Rules and Constraints
The Prisma schema enforces several critical business rules at the database level to ensure data integrity and consistency.

### Required Fields and Defaults
Several fields have default values to ensure consistent data:
- `createdAt` fields use `@default(now())` to automatically set the creation timestamp
- `updatedAt` fields use `@updatedAt` to automatically update the timestamp on record modifications
- `status` fields on Lead and related models have default values (e.g., `LeadStatus.NEW`, `FollowupStatus.PENDING`)
- The `role` field on User has a default value of `USER`

### Unique Constraints
The schema includes unique constraints on several fields to prevent duplicates:
- `User.email` ensures each user has a unique email address
- `Lead.legacyLeadId` prevents duplicate leads from the legacy system
- `Lead.intakeToken` ensures each intake process has a unique token
- `SystemSetting.key` prevents duplicate settings

### Referential Integrity
The schema enforces referential integrity through foreign key constraints:
- All relationships to the Lead model use `onDelete: Cascade` to automatically clean up related records when a lead is deleted
- The `LeadStatusHistory.changedBy` field uses `onDelete: Restrict` to prevent deletion of users who have made status changes, preserving audit trail integrity

### Field-Level Validation
While Prisma doesn't enforce complex validation rules at the database level, the schema design supports application-level validation:
- The use of enums for status fields ensures only valid values are stored
- The separation of personal and business contact information supports comprehensive lead tracking
- The inclusion of intake completion timestamps enables tracking of the application process

### Status Transition Rules
Although not enforced at the database level, the application implements strict business rules for lead status transitions through the LeadStatusService. These rules define which status changes are allowed and whether they require a reason:
- NEW leads can transition to PENDING, IN_PROGRESS, or REJECTED
- PENDING leads can transition to IN_PROGRESS, COMPLETED, or REJECTED
- IN_PROGRESS leads can transition to COMPLETED, REJECTED, or PENDING
- COMPLETED leads can only transition back to IN_PROGRESS with a reason
- REJECTED leads can only transition to PENDING or IN_PROGRESS with a reason

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)
- [src/services/LeadStatusService.ts](file://src/services/LeadStatusService.ts#L21-L58)

## Query Patterns and Prisma Client Usage
The application uses Prisma Client to interact with the database, following several common patterns for data retrieval and manipulation.

### Finding Leads with Relations
```typescript
const lead = await prisma.lead.findUnique({
  where: { id: leadId },
  include: {
    documents: true,
    notes: {
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    },
    followupQueue: {
      orderBy: { scheduledAt: 'asc' }
    },
    notificationLog: {
      orderBy: { createdAt: 'desc' },
      take: 10
    }
  }
});
```
This pattern retrieves a lead with related data, including documents, notes (with user email), follow-up queue entries, and recent notification logs.

### Creating Leads with Relations
```typescript
const lead = await prisma.lead.create({
  data: {
    legacyLeadId: 1001,
    campaignId: 123,
    firstName: "John",
    lastName: "Doe",
    businessName: "Doe Enterprises LLC",
    status: LeadStatus.NEW,
    documents: {
      create: [
        {
          filename: "bank_statement.pdf",
          originalFilename: "Bank Statement.pdf",
          fileSize: 1024000,
          mimeType: "application/pdf",
          b2FileId: "b2_file_id_123",
          b2BucketName: "merchant-funding-documents"
        }
      ]
    }
  }
});
```
This pattern creates a lead and associated documents in a single transaction.

### Updating Lead Status with History
```typescript
await prisma.$transaction([
  prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.IN_PROGRESS }
  }),
  prisma.leadStatusHistory.create({
    data: {
      leadId: leadId,
      previousStatus: LeadStatus.NEW,
      newStatus: LeadStatus.IN_PROGRESS,
      changedBy: userId,
      reason: "Started processing application"
    }
  })
]);
```
This pattern updates a lead's status and creates a status history record in a transaction to ensure both operations succeed or fail together.

### Filtering and Pagination
```typescript
const leads = await prisma.lead.findMany({
  where: {
    status: LeadStatus.IN_PROGRESS,
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  },
  orderBy: { updatedAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize
});
```
This pattern retrieves leads with filtering by status and creation date, with pagination support.

### Aggregation Queries
```typescript
const stats = await prisma.leadStatusHistory.groupBy({
  by: ['newStatus'],
  where: {
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  },
  _count: true
});
```
This pattern groups status changes by new status to generate statistics on lead progression.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)
- [src/services/LeadStatusService.ts](file://src/services/LeadStatusService.ts#L345-L393)

## Indexing and Performance Optimization
The schema includes several indexing strategies to optimize query performance.

### Notification Log Indexing
The notification_log table has a composite index on `created_at DESC, id DESC` to optimize cursor-based pagination for recent notifications:
```sql
CREATE INDEX idx_notification_log_created_at_id ON notification_log(created_at DESC, id DESC);
```
This index supports efficient retrieval of the most recent notifications, which is a common operation in the admin interface.

### Foreign Key Indexes
Prisma automatically creates indexes on foreign key columns, including:
- `leadId` in Document, FollowupQueue, NotificationLog, and LeadStatusHistory tables
- `userId` in Document, LeadNote, and SystemSetting tables
- `changedBy` in LeadStatusHistory table

These indexes ensure that queries filtering by relationships (e.g., "find all documents for a lead") are efficient.

### Unique Indexes
The schema creates unique indexes for fields with unique constraints:
- `User.email`
- `Lead.legacyLeadId`
- `Lead.intakeToken`
- `SystemSetting.key`

These indexes enforce uniqueness constraints and enable fast lookups by these fields.

### Query Optimization Considerations
The application should consider additional indexes for frequently queried patterns:
- Index on `Lead.status` for filtering leads by status
- Composite index on `Lead.status` and `Lead.updatedAt` for retrieving leads by status with recent updates
- Index on `FollowupQueue.scheduledAt` and `FollowupQueue.status` for finding pending follow-ups

The current indexing strategy focuses on the most critical performance scenarios, particularly retrieval of recent notifications and efficient joins through foreign key relationships.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)
- [prisma/migrations/20250812120000_add_notification_log_indexes/migration.sql](file://prisma/migrations/20250812120000_add_notification_log_indexes/migration.sql#L1-L10)

## Schema Evolution and Migrations
The schema has evolved through a series of migrations that reflect changes in business requirements and technical considerations.

### Migration History
The migrations directory contains 14 migrations that track the schema's evolution:
- **20240101000000_init**: Initial schema setup
- **20250728210021_initial_migration**: First major migration
- **20250730060039_add_lead_status_history**: Added lead status history tracking
- **20250811125856_add_system_settings**: Added system settings functionality
- **20250811140542_remove_security_settings**: Removed security settings
- **20250811142825_remove_extra_categories**: Removed extra categories
- **20250811152328_cleanup_unused_settings**: Cleaned up unused settings
- **20250812120000_add_notification_log_indexes**: Added indexes to notification log
- **20250820125127_**: Added connectivity category to system settings
- **20250826082902_add_lead_business_fields**: Added business fields to lead
- **20250826121117_add_comprehensive_lead_fields**: Added comprehensive lead fields
- **20250826125518_add_mobile_field**: Added mobile field to lead
- **20250826203101_change_amount_and_revenue_to_string**: Changed amount and revenue fields to string

### Amount and Revenue Field Changes
The most significant recent change was the migration that converted `amount_needed` and `monthly_revenue` fields from numeric types to strings:
```sql
-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "amount_needed" SET DATA TYPE TEXT,
ALTER COLUMN "monthly_revenue" SET DATA TYPE TEXT;
```
This change was likely made to accommodate various formatting requirements, such as:
- Storing currency symbols ($50,000 instead of 50000)
- Preserving formatting with commas and decimal points
- Supporting multiple currencies with different formatting conventions
- Allowing free-form input from users without strict numeric validation

However, this change has implications:
- Numeric comparisons and aggregations are no longer possible at the database level
- Sorting by amount or revenue requires application-level parsing
- Validation of numeric values must be handled at the application level
- Risk of inconsistent formatting in the database

### Migration Management
The application uses Prisma Migrate to manage schema evolution. Migrations are stored in the `prisma/migrations` directory with timestamp-based names. The `migration_lock.toml` file prevents concurrent migration operations. The seed scripts are designed to work with the current schema version and include safety checks to prevent accidental data loss in production.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)
- [prisma/migrations/20250826203101_change_amount_and_revenue_to_string/migration.sql](file://prisma/migrations/20250826203101_change_amount_and_revenue_to_string/migration.sql#L1-L2)
- [prisma/seed.ts](file://prisma/seed.ts#L1-L511)

## Textual Entity-Relationship Diagram
The following textual representation shows the entity-relationship structure of the Prisma schema:

```
User
|--(1)----<*>---> LeadNote
|--(1)----<*>---> Document (uploadedBy)
|--(1)----<*>---> LeadStatusHistory (changedBy)
|--(1)----<*>---> SystemSetting (updatedBy)

Lead
|--(1)----<*>---> LeadNote
|--(1)----<*>---> Document
|--(1)----<*>---> FollowupQueue
|--(1)----<*>---> NotificationLog
|--(1)----<*>---> LeadStatusHistory
```

### Relationship Details
- **User to LeadNote**: One-to-many. A user can create multiple notes on leads.
- **User to Document**: One-to-many. A user can upload multiple documents.
- **User to LeadStatusHistory**: One-to-many. A user can make multiple status changes.
- **User to SystemSetting**: One-to-many. A user can update multiple system settings.
- **Lead to LeadNote**: One-to-many. A lead can have multiple notes.
- **Lead to Document**: One-to-many. A lead can have multiple documents.
- **Lead to FollowupQueue**: One-to-many. A lead can have multiple follow-up actions.
- **Lead to NotificationLog**: One-to-many. A lead can have multiple notification logs.
- **Lead to LeadStatusHistory**: One-to-many. A lead can have multiple status changes.

### Cardinality and Optionality
- All relationships from User to other models are optional on the child side (a note/document/etc. might not have a user if created by the system).
- All relationships from Lead to other models are required on the child side (a note/document/etc. must belong to a lead).
- The NotificationLog to Lead relationship is optional, allowing system notifications that aren't tied to a specific lead.

This structure supports the application's core functionality of managing leads through the funding process while maintaining a complete audit trail of all actions.

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma#L1-L258)