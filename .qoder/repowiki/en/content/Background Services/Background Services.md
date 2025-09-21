# Background Services

<cite>
**Referenced Files in This Document**   
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts) - *Updated in recent commits to enhance notification content*
- [LeadPoller.ts](file://src/services/LeadPoller.ts) - *Core component for lead import functionality*
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts) - *Manages follow-up communication scheduling*
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts) - *Cron endpoint for lead polling with updated notification content*
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts) - *Cron endpoint for follow-up processing*
- [check-scheduler.mjs](file://scripts/check-scheduler.mjs) - *Operational script for scheduler status verification*
- [ensure-scheduler-running.sh](file://scripts/ensure-scheduler-running.sh) - *Production health check and recovery script*
- [start-scheduler.mjs](file://scripts/start-scheduler.mjs) - *Script for manual scheduler control*
- [notifications.ts](file://src/lib/notifications.ts) - *Added in recent commits for centralized notification formatting*
</cite>

## Update Summary
**Changes Made**   
- Updated notification content sections to reflect recent enhancements in email content, link text, button styles, and personalization
- Added documentation for centralized lead name formatting logic introduced in recent commits
- Enhanced security considerations section to reflect improved notification consistency and formatting
- Updated data flow description to include centralized formatting functions
- Added new section sources for notifications.ts file that was enhanced in recent commits

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Detailed Component Analysis](#detailed-component-analysis)
5. [Data Flow and Processing](#data-flow-and-processing)
6. [Monitoring and Operational Guidance](#monitoring-and-operational-guidance)
7. [Error Handling and Recovery](#error-handling-and-recovery)
8. [Security Considerations](#security-considerations)

## Introduction
The fund-track application implements a robust background processing system for handling scheduled tasks related to lead management and follow-up notifications. This system is designed to automate critical business processes including polling for new leads from a legacy database, sending timely follow-up communications, and maintaining system health through periodic cleanup operations. The architecture is built around a centralized scheduler that coordinates multiple background jobs using cron-style scheduling patterns, with comprehensive error handling, monitoring, and operational controls to ensure reliability and maintainability. Recent enhancements have focused on improving the content, clarity, and consistency of automated notifications sent to leads.

## Architecture Overview

``mermaid
graph TB
subgraph "Scheduler Core"
BJS[BackgroundJobScheduler]
end
subgraph "Scheduled Jobs"
LP[Lead Polling Job]
FU[Follow-Up Processing Job]
CL[Cleanup Job]
end
subgraph "External Systems"
LD[Legacy Database]
NS[Notification Service]
DB[(Primary Database)]
end
subgraph "API Endpoints"
C1[/api/cron/poll-leads]
C2[/api/cron/send-followups]
end
subgraph "Operational Scripts"
OS[Operational Scripts]
end
BJS --> LP
BJS --> FU
BJS --> CL
LP --> LD
LP --> DB
LP --> NS
FU --> DB
FU --> NS
CL --> DB
C1 --> LP
C2 --> FU
OS --> BJS
style BJS fill:#4CAF50,stroke:#388E3C
style LP fill:#2196F3,stroke:#1976D2
style FU fill:#2196F3,stroke:#1976D2
style CL fill:#2196F3,stroke:#1976D2
style LD fill:#FF9800,stroke:#F57C00
style NS fill:#9C27B0,stroke:#7B1FA2
style DB fill:#607D8B,stroke:#455A64
style C1 fill:#00BCD4,stroke:#0097A7
style C2 fill:#00BCD4,stroke:#0097A7
style OS fill:#795548,stroke:#5D4037
```

**Diagram sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)

## Core Components

The background processing system in fund-track consists of several key components that work together to automate lead management workflows. The **BackgroundJobScheduler** serves as the central coordinator, managing the execution of scheduled tasks according to configurable cron patterns. It orchestrates three primary jobs: lead polling, follow-up processing, and system cleanup. The **LeadPoller** component is responsible for extracting new leads from a legacy database system and importing them into the application's primary database. The **FollowUpScheduler** manages a queue of follow-up communications, ensuring timely reminders are sent to incomplete applications. These components are supported by notification services and operational scripts that enable monitoring and manual intervention when needed. Recent updates have enhanced the notification content and formatting across all components.

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)

## Detailed Component Analysis

### BackgroundJobScheduler Analysis

``mermaid
classDiagram
class BackgroundJobScheduler {
-leadPollingTask : ScheduledTask
-followUpTask : ScheduledTask
-cleanupTask : ScheduledTask
-isRunning : boolean
+start() : void
+stop() : void
+getStatus() : object
+executeLeadPollingManually() : Promise~void~
+executeFollowUpManually() : Promise~void~
+executeCleanupManually() : Promise~void~
}
class LeadPoller {
+pollAndImportLeads() : Promise~PollingResult~
+getLeadsNeedingIntakeTokens() : Promise~Lead[]~
+updateLeadWithIntakeToken(leadId, token) : Promise~void~
}
class FollowUpScheduler {
+scheduleFollowUpsForLead(leadId) : Promise~FollowUpScheduleResult~
+cancelFollowUpsForLead(leadId) : Promise~boolean~
+processFollowUpQueue() : Promise~FollowUpProcessResult~
+cleanupOldFollowUps(daysOld) : Promise~number~
}
class NotificationService {
+sendEmail(to, subject, text, html, leadId) : Promise~object~
+sendSMS(to, message, leadId) : Promise~object~
}
BackgroundJobScheduler --> LeadPoller : "uses"
BackgroundJobScheduler --> FollowUpScheduler : "uses"
BackgroundJobScheduler --> NotificationService : "uses"
BackgroundJobScheduler --> "node-cron" : "depends on"
BackgroundJobScheduler --> "prisma" : "database access"
BackgroundJobScheduler --> "logger" : "logging"
```

**Diagram sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)

### LeadPoller Analysis

``mermaid
flowchart TD
Start([Start Lead Polling]) --> Connect["Connect to Legacy Database"]
Connect --> GetLatest["Get Latest Legacy Lead ID"]
GetLatest --> Fetch["Fetch New Leads from Legacy DB"]
Fetch --> Process["Process Leads in Batches"]
Process --> Transform["Transform Legacy Lead Data"]
Transform --> Import["Import Lead into Primary Database"]
Import --> ScheduleFU["Schedule Follow-Ups for New Lead"]
ScheduleFU --> NextLead["Next Lead in Batch"]
NextLead --> ProcessBatch{"All Leads Processed?"}
ProcessBatch --> |No| Process
ProcessBatch --> |Yes| Complete["Complete Batch Processing"]
Complete --> NextBatch{"All Batches Processed?"}
NextBatch --> |No| Process
NextBatch --> |Yes| Disconnect["Disconnect from Legacy DB"]
Disconnect --> End([Lead Polling Complete])
style Start fill:#4CAF50,stroke:#388E3C
style End fill:#4CAF50,stroke:#388E3C
style ProcessBatch fill:#2196F3,stroke:#1976D2
style NextBatch fill:#2196F3,stroke:#1976D2
```

**Diagram sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)

**Section sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)

### FollowUpScheduler Analysis

``mermaid
sequenceDiagram
participant Scheduler as "BackgroundJobScheduler"
participant FUS as "FollowUpScheduler"
participant DB as "Database"
participant NS as "NotificationService"
Scheduler->>FUS : executeFollowUpJob()
FUS->>DB : findMany({ status : PENDING, scheduledAt <= now })
DB-->>FUS : dueFollowUps
loop Each Follow-Up
FUS->>FUS : Check lead status
alt Lead status is PENDING
FUS->>NS : sendFollowUpNotifications(followUp)
NS->>NS : Get follow-up messages by type
NS->>NS : Send email if available
NS->>NS : Send SMS if available
NS-->>FUS : sendResult
FUS->>DB : update follow-up status to SENT
else Lead status changed
FUS->>DB : update follow-up status to CANCELLED
end
end
FUS-->>Scheduler : FollowUpProcessResult
```

**Diagram sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)

**Section sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)

## Data Flow and Processing

The background processing system follows a well-defined data flow pattern from scheduled execution to database updates and external service calls. When the scheduler triggers the lead polling job according to its cron pattern (default: every 15 minutes), it initiates a process that connects to the legacy database, retrieves new leads based on the latest imported ID, and processes them in configurable batches. Each lead is transformed from the legacy schema to the application's data model, with data sanitization and token generation for secure application access. New leads are imported into the primary database, and follow-up notifications are scheduled according to a predefined timeline (3, 9, 24, and 72 hours after import). The follow-up processing job runs more frequently (every 5 minutes by default) to check for due notifications, sending emails and SMS messages through the notification service while respecting the lead's current status. This ensures that communications are only sent to leads that remain in the PENDING state.

Recent enhancements have improved the notification content with more specific instructions, contact details, and consistent link text and button styles. The system now uses centralized lead name formatting through the `formatLeadName` function in `notifications.ts`, which ensures consistent capitalization and personalization across all communications. This function capitalizes the first letter of the first name and converts the rest to lowercase, providing a professional and consistent greeting format.

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)
- [notifications.ts](file://src/lib/notifications.ts#L22-L241)

## Monitoring and Operational Guidance

The system provides comprehensive monitoring and operational tools to ensure scheduler health and facilitate troubleshooting. The `check-scheduler.mjs` script allows developers and operations teams to verify the scheduler's status, displaying current configuration, next execution times, and environment settings. This script connects to the `/api/dev/scheduler-status` endpoint to retrieve real-time information about the scheduler's state.

For production environments, the `ensure-scheduler-running.sh` script implements a robust health check and recovery mechanism. It first verifies that the server is responsive, then checks the scheduler status, and automatically starts the scheduler if it's not running. The script includes a manual polling test to confirm functionality after startup, providing confidence that the background system is fully operational.

Administrators can manually control the scheduler using the `start-scheduler.mjs` script, which provides detailed status information before and after starting the service. This script also handles graceful shutdown on SIGINT and SIGTERM signals, ensuring proper cleanup of scheduled tasks.

``mermaid
flowchart TD
A[Check Scheduler Status] --> B{Scheduler Running?}
B --> |Yes| C[Display Status and Next Run Times]
B --> |No| D[Start Scheduler]
D --> E{Start Successful?}
E --> |Yes| F[Test Manual Polling]
F --> G[Display Success Message]
E --> |No| H[Display Error and Exit]
C --> I[Show Environment Configuration]
I --> J[Display Operational Tips]
```

**Diagram sources**
- [check-scheduler.mjs](file://scripts/check-scheduler.mjs#L1-L20)
- [ensure-scheduler-running.sh](file://scripts/ensure-scheduler-running.sh#L1-L20)
- [start-scheduler.mjs](file://scripts/start-scheduler.mjs#L1-L20)

**Section sources**
- [check-scheduler.mjs](file://scripts/check-scheduler.mjs#L1-L72)
- [ensure-scheduler-running.sh](file://scripts/ensure-scheduler-running.sh#L1-L93)
- [start-scheduler.mjs](file://scripts/start-scheduler.mjs#L1-L58)

## Error Handling and Recovery

The background processing system implements comprehensive error handling and recovery strategies to ensure reliability and data integrity. Each scheduled job is wrapped in try-catch blocks that log errors to both the application logs and the database for monitoring purposes. When a lead polling job fails, the system creates a notification log entry to alert administrators, ensuring that failures are not silently ignored.

The LeadPoller implements a batch processing strategy with individual lead error isolation, meaning that failures in processing one lead do not prevent the processing of subsequent leads in the same batch. This approach maximizes data import success rates while maintaining detailed error records for troubleshooting.

The FollowUpScheduler includes automatic cancellation of follow-ups when a lead's status changes from PENDING, preventing unnecessary communications to leads that have already completed their applications or been disqualified. This status check occurs immediately before sending each notification, ensuring that the system responds promptly to status changes.

For database operations, the system leverages Prisma's transaction capabilities where appropriate and implements proper connection management, including explicit disconnection from the legacy database after polling operations to prevent resource leaks.

**Section sources**
- [BackgroundJobScheduler.ts](file://src/services/BackgroundJobScheduler.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L50)

## Security Considerations

The background processing system incorporates several security measures to protect data and prevent unauthorized access. The cron-style API endpoints at `/api/cron/poll-leads` and `/api/cron/send-followups` are designed to be triggered by external cron services or monitoring tools, but they lack explicit authentication mechanisms in the provided code. This suggests that security is likely enforced at the network level (e.g., IP restrictions, firewall rules) or through the deployment environment.

When importing leads, the system generates secure intake tokens using the TokenService, which provides a cryptographically secure random token for each new lead. These tokens enable secure, personalized access to the application intake process without exposing sensitive identifiers.

Data sanitization is performed on all string fields from the legacy database, with trimming and null handling to prevent injection attacks and ensure data quality. Phone numbers are validated for proper format before storage, reducing the risk of malformed data.

The system follows the principle of least privilege in database access, with the background jobs using the same Prisma client as the rest of the application, suggesting that database permissions are managed at the connection level rather than through application-level role differentiation.

Recent updates have enhanced security through improved notification consistency and centralized formatting logic. The introduction of the `formatLeadName` function in `notifications.ts` ensures consistent and secure name formatting, preventing potential injection issues and maintaining professional communication standards. Email content has been enhanced with specific instructions and contact details, reducing the risk of phishing attempts by providing clear, official communication channels.

**Section sources**
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts#L1-L50)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts#L1-L50)
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L50)
- [notifications.ts](file://src/lib/notifications.ts#L22-L241)