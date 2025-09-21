# Core Features

<cite>
**Referenced Files in This Document**   
- [LeadPoller.ts](file://src/services/LeadPoller.ts) - *Updated to support industry field*
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [IntakeWorkflow.tsx](file://src/components/intake/IntakeWorkflow.tsx) - *Updated to include digital signature step*
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx) - *Added in recent commit*
- [step3/route.ts](file://src/app/api/intake/[token]/step3/route.ts) - *Added in recent commit*
- [application/[token]/page.tsx](file://src/app/application/[token]/page.tsx)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts)
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts)
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts)
- [status/route.ts](file://src/app/api/leads/[id]/status/route.ts)
- [lead-status-history.migration.sql](file://prisma/migrations/20250730060039_add_lead_status_history/migration.sql)
- [add_digital_signature.migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql) - *Added digital signature fields*
- [replace_nature_of_business_with_industry.migration.sql](file://prisma/migrations/20250829131033_replace_nature_of_business_with_industry/migration.sql) - *Replaced field and removed deprecated columns*
</cite>

## Update Summary
**Changes Made**   
- Added documentation for the new digital signature step in the intake workflow
- Updated business information section to reflect replacement of natureOfBusiness with industry field
- Removed references to deprecated intake fields (date_business_started, personal_city, personal_state)
- Updated diagrams to reflect the three-step intake process including digital signature
- Added new section sources for newly implemented files and updated existing ones

## Table of Contents
1. [Introduction](#introduction)
2. [Lead Management](#lead-management)
3. [Intake Processing](#intake-processing)
4. [Automated Notifications](#automated-notifications)
5. [End-to-End Data Flow](#end-to-end-data-flow)
6. [Business Rules](#business-rules)
7. [Usage Examples](#usage-examples)
8. [Meeting Business Requirements](#meeting-business-requirements)

## Introduction
The fund-track application provides a comprehensive solution for managing merchant funding workflows. This document details the core features that support this workflow, focusing on the integration of lead management, intake processing, and automated notifications. The system is designed to streamline the merchant funding process from initial lead capture through to funding completion, ensuring efficiency, traceability, and customer engagement. Recent updates have enhanced the intake workflow with a digital signature requirement and updated business information collection.

## Lead Management

The lead management system is responsible for importing leads from a legacy system, tracking their status, and maintaining a complete history of all changes. Leads are imported through a polling mechanism that connects to the legacy database and retrieves new leads based on their ID.

The LeadPoller service handles the import process, connecting to the legacy database and retrieving leads that have not yet been imported. It processes leads in batches to ensure efficient handling of large volumes. Each lead is transformed from the legacy format to the application's format, with data sanitization applied to ensure consistency. During this transformation, the system now maps relevant business information to the updated schema, including the industry field that replaced nature_of_business.

``mermaid
flowchart TD
A[Legacy Database] --> B[LeadPoller Service]
B --> C{New Leads?}
C --> |Yes| D[Transform Lead Data]
D --> E[Generate Intake Token]
E --> F[Create Lead in Database]
F --> G[Scheduled Follow-ups]
C --> |No| H[No Action]
```

**Section sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L21-L497) - *Updated to support industry field*
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts#L0-L192)

## Intake Processing

The intake processing workflow allows merchants to complete their funding applications through a secure, token-based system. When a lead is imported, a unique intake token is generated and stored with the lead record. This token provides secure access to the application form without requiring authentication.

The intake process is divided into three steps, allowing merchants to complete their application in stages. The IntakeWorkflow component manages the user's progress through these steps, displaying the appropriate form based on their current progress. When a merchant accesses the application URL with their token, the TokenService validates the token and retrieves the lead's current intake status.

The third step of the intake process now requires a digital signature, which serves as formal confirmation that all provided information is accurate and complete. This signature is captured through a canvas-based interface and stored as a base64-encoded image in the database.

``mermaid
sequenceDiagram
participant Merchant as "Merchant"
participant Browser as "Browser"
participant TokenService as "TokenService"
participant Database as "Database"
Merchant->>Browser : Access application URL with token
Browser->>TokenService : Validate token
TokenService->>Database : Query lead by intake token
Database-->>TokenService : Return lead data
TokenService-->>Browser : Return intake session data
Browser->>Merchant : Display appropriate intake form
Merchant->>Browser : Complete digital signature
Browser->>Database : Store signature and mark intake as complete
```

**Diagram sources**
- [TokenService.ts](file://src/services/TokenService.ts#L56-L312)
- [IntakeWorkflow.tsx](file://src/components/intake/IntakeWorkflow.tsx#L0-L32)
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L0-L277) - *Digital signature implementation*

**Section sources**
- [TokenService.ts](file://src/services/TokenService.ts#L56-L312)
- [IntakeWorkflow.tsx](file://src/components/intake/IntakeWorkflow.tsx#L0-L32)
- [application/[token]/page.tsx](file://src/app/application/[token]/page.tsx#L0-L45)
- [step3/route.ts](file://src/app/api/intake/[token]/step3/route.ts#L0-L114) - *Digital signature API endpoint*
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L0-L277) - *Digital signature UI component*

## Automated Notifications

The automated notification system ensures timely follow-up communications with merchants, increasing the likelihood of application completion. When a new lead is imported, a series of follow-up notifications are scheduled at specific intervals: 3 hours, 9 hours, 24 hours, and 72 hours after import.

The FollowUpScheduler service manages the follow-up queue, processing due notifications and sending emails and SMS messages to merchants. Notifications include a personalized message with a direct link to the merchant's application, making it easy to resume the intake process. The system checks rate limits to prevent spamming and logs all notification attempts for auditing.

``mermaid
flowchart TD
A[New Lead Imported] --> B[Schedule Follow-ups]
B --> C{Follow-up Due?}
C --> |Yes| D[Send Email and SMS]
D --> E[Update Follow-up Status]
C --> |No| F[Wait]
E --> G{Intake Completed?}
G --> |Yes| H[Cancel Remaining Follow-ups]
G --> |No| I[Continue Scheduling]
```

**Diagram sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L19-L486)

**Section sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L19-L486)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts#L0-L103)
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L0-L462)

## End-to-End Data Flow

The end-to-end data flow begins with lead import from the legacy system and continues through the entire funding workflow. The BackgroundJobScheduler orchestrates this process by scheduling regular polling of the legacy database and processing of follow-up notifications.

When the lead polling job runs, it imports new leads, generates intake tokens, and schedules initial follow-ups. As merchants complete their applications, including the new digital signature step, the system updates their status and cancels any remaining follow-ups. The complete history of all status changes is recorded in the database, providing full traceability.

``mermaid
sequenceDiagram
participant Scheduler as "BackgroundJobScheduler"
participant Poller as "LeadPoller"
participant DB as "Database"
participant FollowUp as "FollowUpScheduler"
Scheduler->>Poller : Execute lead polling job
Poller->>DB : Connect to legacy database
DB-->>Poller : Return new leads
Poller->>DB : Import leads with intake tokens
Poller->>FollowUp : Schedule follow-ups for new leads
FollowUp->>DB : Create follow-up queue entries
Scheduler->>FollowUp : Execute follow-up job
FollowUp->>DB : Process due follow-ups
DB-->>FollowUp : Return due follow-ups
FollowUp->>Merchant : Send email and SMS notifications
```

**Diagram sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L0-L462)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L21-L497)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L19-L486)

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L0-L462)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L21-L497)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L19-L486)

## Business Rules

The system enforces strict business rules for lead status transitions and notification timing. These rules ensure data integrity and provide a consistent experience for both merchants and staff.

### Lead Status Transitions
Lead status transitions follow a predefined set of rules that govern which status changes are allowed. The LeadStatusService validates all status changes against these rules before applying them. The valid transitions are:

- NEW → PENDING, IN_PROGRESS, REJECTED
- PENDING → IN_PROGRESS, COMPLETED, REJECTED
- IN_PROGRESS → COMPLETED, REJECTED, PENDING
- COMPLETED → IN_PROGRESS (with reason required)
- REJECTED → PENDING, IN_PROGRESS (with reason required)

When a lead's status is changed, the system records the change in the lead_status_history table, capturing the previous status, new status, timestamp, and reason (if required). This provides a complete audit trail of all status changes.

``mermaid
stateDiagram-v2
[*] --> NEW
NEW --> PENDING : New lead imported
NEW --> IN_PROGRESS : Direct to review
NEW --> REJECTED : Not qualified
PENDING --> IN_PROGRESS : Merchant responded
PENDING --> COMPLETED : Funding approved
PENDING --> REJECTED : Merchant declined
IN_PROGRESS --> COMPLETED : Funding approved
IN_PROGRESS --> REJECTED : Application denied
IN_PROGRESS --> PENDING : Awaiting response
COMPLETED --> IN_PROGRESS : Reopened
REJECTED --> PENDING : Reopened
REJECTED --> IN_PROGRESS : Reopened
```

**Diagram sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L21-L58)
- [lead-status-history.migration.sql](file://prisma/migrations/20250730060039_add_lead_status_history/migration.sql#L0-L4)

**Section sources**
- [LeadStatusService.ts](file://src/services/LeadStatusService.ts#L21-L58)
- [status/route.ts](file://src/app/api/leads/[id]/status/route.ts#L0-L63)

### Notification Timing
Notifications are scheduled according to a strict timing schedule to maximize engagement while avoiding excessive communication. The follow-up schedule is:

- 3 hours after lead import: Initial reminder
- 9 hours after lead import: Second reminder
- 24 hours after lead import: Final reminder
- 72 hours after lead import: Last chance notification

When a merchant completes their intake, all remaining follow-ups are automatically cancelled to prevent unnecessary communications. This ensures that merchants are not contacted after they have completed their application.

## Usage Examples

### Typical User Journey: Merchant
1. A merchant submits information through a marketing campaign, creating a lead in the legacy system.
2. The fund-track application imports the lead during the next polling cycle (every 15 minutes).
3. The merchant receives an email and SMS within 3 hours with a link to complete their application.
4. The merchant clicks the link, which contains their unique intake token.
5. The merchant completes Step 1 of the application, providing basic business information including their industry.
6. The merchant returns later to complete Step 2, uploading required documents.
7. The merchant completes Step 3 by providing a digital signature, which confirms their application is complete.
8. Upon completion, the lead status automatically changes to IN_PROGRESS, and remaining follow-ups are cancelled.
9. A staff member reviews the application and updates the status to COMPLETED when funding is approved.

### Typical User Journey: Staff Member
1. A staff member logs into the dashboard and views the list of leads.
2. They filter leads by status to find those in IN_PROGRESS status that require review.
3. They click on a lead to view detailed information, including the status history and the digital signature.
4. They verify the information and documents provided by the merchant.
5. They change the lead status to COMPLETED, entering a reason for the change.
6. The system records the status change in the history and notifies relevant team members.

## Meeting Business Requirements

The core features of the fund-track application directly address the key business requirements of efficiency, traceability, and customer engagement.

### Efficiency
The automated lead import and notification system eliminates manual data entry and follow-up tasks. Background jobs run on a regular schedule, ensuring leads are processed promptly without requiring staff intervention. The token-based intake system allows merchants to complete their applications at their convenience, reducing the need for back-and-forth communication. The addition of the digital signature step formalizes the completion process without adding complexity.

### Traceability
Every status change is recorded in the lead_status_history table, providing a complete audit trail. The system captures who made each change, when it was made, and the reason for the change (when required). This level of traceability ensures accountability and provides valuable data for process improvement. The digital signature provides legal verification of the merchant's confirmation of their application details.

### Customer Engagement
The automated follow-up system maintains consistent communication with merchants, increasing the likelihood of application completion. Personalized messages with direct links make it easy for merchants to resume their application. The multi-channel approach (email and SMS) ensures messages are received even if one channel is not monitored. The updated intake process with the digital signature step provides a professional and secure experience that builds trust with merchants.

The integration of these features creates a seamless workflow that supports the merchant funding process from start to finish, ensuring a positive experience for both merchants and staff while maintaining data integrity and operational efficiency.