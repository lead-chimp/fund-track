# Operational Capabilities

<cite>
**Referenced Files in This Document**   
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts)
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts)
- [live/route.ts](file://src/app/api/health/live/route.ts)
- [ready/route.ts](file://src/app/api/health/ready/route.ts)
- [backup-database.sh](file://scripts/backup-database.sh)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)
- [debug-migrations.sh](file://scripts/debug-migrations.sh)
- [ensure-scheduler-running.sh](file://scripts/ensure-scheduler-running.sh)
- [health-check.sh](file://scripts/health-check.sh)
- [prisma-migrate-and-start.mjs](file://scripts/prisma-migrate-and-start.mjs)
- [start-scheduler.mjs](file://scripts/start-scheduler.mjs)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts)
- [prisma.ts](file://src/lib/prisma.ts)
- [logger.ts](file://src/lib/logger.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Background Job Scheduling](#background-job-scheduling)
3. [Health Monitoring](#health-monitoring)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Job Scheduling Architecture](#job-scheduling-architecture)
6. [Failure Recovery Mechanisms](#failure-recovery-mechanisms)
7. [Operational Best Practices](#operational-best-practices)
8. [Common Operational Tasks](#common-operational-tasks)

## Introduction
The fund-track system is designed to automate lead acquisition and follow-up processes for merchant funding applications. This document details the operational capabilities of the system, focusing on background job scheduling, health monitoring, and maintenance procedures. The system uses cron-triggered endpoints to import leads from a legacy database and send automated notifications to applicants. Health check endpoints ensure system availability and readiness, while a suite of scripts supports database management, migration debugging, disaster recovery, and scheduler operations. The architecture emphasizes reliability, with comprehensive error handling and recovery mechanisms.

## Background Job Scheduling

The fund-track system implements two primary background services for automated operations: LeadPoller and FollowUpScheduler. These services are triggered via cron jobs and handle lead importation and notification workflows respectively.

### LeadPoller Service
The LeadPoller service imports new leads from a legacy database into the current system. It operates by:

1. Connecting to the legacy database using configuration from environment variables
2. Identifying new leads by comparing against the highest legacy lead ID already imported
3. Fetching leads from campaign-specific tables in batches
4. Transforming and sanitizing data for the new schema
5. Creating new lead records with unique intake tokens
6. Scheduling follow-up notifications for new leads

```mermaid
sequenceDiagram
participant Cron as Cron Scheduler
participant API as poll-leads API
participant LeadPoller as LeadPoller Service
participant LegacyDB as Legacy Database
participant Prisma as Prisma ORM
participant FollowUp as FollowUpScheduler
Cron->>API : POST /api/cron/poll-leads
API->>LeadPoller : createLeadPoller()
LeadPoller->>LegacyDB : Connect()
LeadPoller->>LegacyDB : Query new leads
LegacyDB-->>LeadPoller : Return leads
loop For each batch
LeadPoller->>LeadPoller : Process batch
loop For each lead
LeadPoller->>LeadPoller : transformLegacyLead()
LeadPoller->>Prisma : Create lead record
Prisma-->>LeadPoller : New lead
LeadPoller->>FollowUp : scheduleFollowUpsForLead()
end
end
LeadPoller->>API : Return polling results
API->>Cron : JSON response
```

**Diagram sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L100-L522)
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts#L10-L180)

**Section sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L1-L522)
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts#L1-L193)

### FollowUpScheduler Service
The FollowUpScheduler manages automated notifications to applicants who have not completed their funding applications. When a new lead is imported, the system schedules a series of follow-ups at specific intervals (3, 9, 24, and 72 hours). The scheduler periodically checks for due notifications and sends them via email and SMS.

```mermaid
sequenceDiagram
participant Cron as Cron Scheduler
participant API as send-followups API
participant Scheduler as FollowUpScheduler
participant Prisma as Prisma ORM
participant Notification as NotificationService
participant Lead as Lead Record
Cron->>API : POST /api/cron/send-followups
API->>Scheduler : processFollowUpQueue()
Scheduler->>Prisma : Find due follow-ups
Prisma-->>Scheduler : Due follow-ups
loop For each due follow-up
Scheduler->>Lead : Check status
alt Lead still pending
Scheduler->>Notification : sendFollowUpNotifications()
Notification->>Notification : getFollowUpMessages()
Notification->>Notification : sendEmail()
Notification->>Notification : sendSMS()
Notification-->>Scheduler : Send results
Scheduler->>Prisma : Update follow-up status
else Lead status changed
Scheduler->>Prisma : Cancel follow-up
end
end
Scheduler->>API : Return processing results
API->>Cron : JSON response
```

**Diagram sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L100-L400)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts#L10-L80)

**Section sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L1-L491)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts#L1-L104)

## Health Monitoring

The system provides two health check endpoints that serve different purposes in monitoring system status and readiness.

### Liveness Probe (/health/live)
The liveness endpoint determines whether the application is running and should be restarted. It performs a basic check that only verifies the application can respond to requests.

```mermaid
flowchart TD
Start([GET /health/live]) --> CheckResponse["Can respond to HTTP request?"]
CheckResponse --> |Yes| ReturnAlive["Return 200 OK with status: alive"]
CheckResponse --> |No| ReturnDead["Return 503 Service Unavailable"]
style Start fill:#4CAF50,stroke:#388E3C
style ReturnAlive fill:#4CAF50,stroke:#388E3C
style ReturnDead fill:#F44336,stroke:#D32F2F
```

**Section sources**
- [live/route.ts](file://src/app/api/health/live/route.ts#L1-L28)

### Readiness Probe (/health/ready)
The readiness endpoint verifies whether the application is ready to serve traffic by checking critical dependencies including database connectivity and required environment variables.

```mermaid
flowchart TD
Start([GET /health/ready]) --> CheckDB["Check database health"]
CheckDB --> |Healthy| CheckEnv["Check required environment variables"]
CheckDB --> |Unhealthy| ReturnNotReadyDB["Return 503: database not accessible"]
CheckEnv --> |All present| ReturnReady["Return 200 OK with status: ready"]
CheckEnv --> |Missing| ReturnNotReadyEnv["Return 503: missing environment variable"]
style Start fill:#2196F3,stroke:#1976D2
style ReturnReady fill:#4CAF50,stroke:#388E3C
style ReturnNotReadyDB fill:#F44336,stroke:#D32F2F
style ReturnNotReadyEnv fill:#F44336,stroke:#D32F2F
```

**Diagram sources**
- [ready/route.ts](file://src/app/api/health/ready/route.ts#L1-L58)
- [database-error-handler.ts](file://src/lib/database-error-handler.ts#L1-L20)

**Section sources**
- [ready/route.ts](file://src/app/api/health/ready/route.ts#L1-L58)

## Maintenance Procedures

The system includes a comprehensive suite of operational scripts for database management, migration debugging, disaster recovery, and scheduler management.

### Database Backup and Recovery
The backup-database.sh script creates compressed backups of the database, while disaster-recovery.sh handles restoration from backups.

```mermaid
flowchart LR
Backup["backup-database.sh"] --> |Creates| Archive["Compressed SQL Archive"]
Archive --> |Stored in| Storage["Secure Storage"]
Storage --> |Used by| Recovery["disaster-recovery.sh"]
Recovery --> |Restores to| Database["Production Database"]
```

**Section sources**
- [backup-database.sh](file://scripts/backup-database.sh)
- [disaster-recovery.sh](file://scripts/disaster-recovery.sh)

### Migration Management
The debug-migrations.sh script helps diagnose and resolve database migration issues, while prisma-migrate-and-start.mjs handles schema synchronization during deployment.

```mermaid
flowchart TD
Deploy["Deployment Process"] --> CheckMigrations["prisma-migrate-and-start.mjs"]
CheckMigrations --> |No pending migrations| StartApp["Start Application"]
CheckMigrations --> |Pending migrations| ApplyMigrations["Apply migrations"]
ApplyMigrations --> |Success| StartApp
ApplyMigrations --> |Failure| Debug["debug-migrations.sh"]
Debug --> |Diagnose issues| Resolve["Resolve migration conflicts"]
Resolve --> ApplyMigrations
```

**Section sources**
- [prisma-migrate-and-start.mjs](file://scripts/prisma-migrate-and-start.mjs)
- [debug-migrations.sh](file://scripts/debug-migrations.sh)

### Scheduler Management
The system includes scripts to ensure the background job scheduler is running properly, including ensure-scheduler-running.sh and start-scheduler.mjs.

```mermaid
flowchart TD
Monitor["ensure-scheduler-running.sh"] --> CheckScheduler["Is scheduler running?"]
CheckScheduler --> |No| Start["start-scheduler.mjs"]
CheckScheduler --> |Yes| Verify["Verify scheduler health"]
Verify --> |Unhealthy| Restart["Restart scheduler"]
Verify --> |Healthy| Continue["Continue monitoring"]
Start --> |Success| Running["Scheduler running"]
Start --> |Failure| Alert["Send alert to operations team"]
```

**Section sources**
- [ensure-scheduler-running.sh](file://scripts/ensure-scheduler-running.sh)
- [start-scheduler.mjs](file://scripts/start-scheduler.mjs)

## Job Scheduling Architecture

The job scheduling architecture follows a cron-triggered pattern with API endpoints that invoke service classes to perform background operations.

```mermaid
graph TD
CronScheduler --> |POST| PollLeadsEndpoint["/api/cron/poll-leads"]
CronScheduler --> |POST| SendFollowupsEndpoint["/api/cron/send-followups"]
PollLeadsEndpoint --> LeadPollerService["LeadPoller Service"]
SendFollowupsEndpoint --> FollowUpSchedulerService["FollowUpScheduler Service"]
LeadPollerService --> LegacyDB["Legacy Database"]
LeadPollerService --> PrismaDB["Prisma Database"]
FollowUpSchedulerService --> PrismaDB
FollowUpSchedulerService --> NotificationService["Notification Service"]
NotificationService --> EmailProvider["Email Provider"]
NotificationService --> SMSProvider["SMS Provider"]
classDef service fill:#2196F3,stroke:#1976D2;
classDef database fill:#4CAF50,stroke:#388E3C;
classDef external fill:#9C27B0,stroke:#7B1FA2;
class LeadPollerService,FollowUpSchedulerService service
class PrismaDB,LegacyDB database
class EmailProvider,SMSProvider external
```

**Diagram sources**
- [poll-leads/route.ts](file://src/app/api/cron/poll-leads/route.ts)
- [send-followups/route.ts](file://src/app/api/cron/send-followups/route.ts)
- [LeadPoller.ts](file://src/services/LeadPoller.ts)
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts)

## Failure Recovery Mechanisms

The system implements multiple failure recovery mechanisms to ensure reliability and data consistency.

### Error Handling in Lead Import
The LeadPoller service includes comprehensive error handling with retry mechanisms and detailed logging.

```mermaid
flowchart TD
StartImport["Start lead import"] --> ConnectDB["Connect to legacy DB"]
ConnectDB --> |Success| FetchLeads["Fetch new leads"]
ConnectDB --> |Failure| RetryConnect["Retry connection"]
RetryConnect --> |Max retries reached| LogError["Log error and continue"]
FetchLeads --> |Success| ProcessBatches["Process batches"]
FetchLeads --> |Failure| SkipCampaign["Skip campaign, continue with others"]
ProcessBatches --> |Batch success| NextBatch["Process next batch"]
ProcessBatches --> |Batch failure| LogBatchError["Log batch error, continue"]
NextBatch --> |All batches processed| Complete["Import complete"]
Complete --> DisconnectDB["Disconnect from legacy DB"]
```

**Section sources**
- [LeadPoller.ts](file://src/services/LeadPoller.ts#L100-L300)

### Notification Delivery Resilience
The FollowUpScheduler handles notification failures gracefully, ensuring partial success is recorded and processing continues.

```mermaid
flowchart TD
StartProcessing["Start follow-up processing"] --> FindDue["Find due follow-ups"]
FindDue --> |Found| ProcessFollowUp["Process each follow-up"]
ProcessFollowUp --> CheckStatus["Check lead status"]
CheckStatus --> |Not pending| CancelFollowUp["Cancel follow-up"]
CheckStatus --> |Pending| SendNotifications["Send email and SMS"]
SendNotifications --> |Email success| MarkEmailSent["Record email sent"]
SendNotifications --> |Email failure| LogEmailError["Log email error"]
SendNotifications --> |SMS success| MarkSMSSent["Record SMS sent"]
SendNotifications --> |SMS failure| LogSMSError["Log SMS error"]
MarkEmailSent --> MarkSent["Mark follow-up as sent"]
MarkSMSSent --> MarkSent
LogEmailError --> |At least one succeeded| MarkSent
LogEmailError --> |Both failed| MarkError["Record error"]
MarkSent --> NextFollowUp["Process next follow-up"]
MarkError --> NextFollowUp
NextFollowUp --> |All processed| Complete["Processing complete"]
```

**Section sources**
- [FollowUpScheduler.ts](file://src/services/FollowUpScheduler.ts#L200-L400)

## Operational Best Practices

### System Monitoring
Implement comprehensive monitoring using the provided health check endpoints:

- Use /health/live for container orchestration liveness probes
- Use /health/ready for readiness probes before routing traffic
- Monitor follow-up queue statistics via GET /api/cron/send-followups
- Set up alerts for failed background jobs

### Performance Tuning
Optimize system performance by adjusting configuration parameters:

- Adjust LEAD_POLLING_BATCH_SIZE environment variable based on legacy database performance
- Monitor processing time per lead and adjust batch sizes accordingly
- Ensure database indexes are optimized for frequent queries
- Regularly clean up old follow-up records using cleanupOldFollowUps()

### Incident Response
Follow this procedure when incidents occur:

1. Check /health/ready endpoint to verify system readiness
2. Review application logs for error messages
3. Verify database connectivity and environment variables
4. Check the status of background job schedulers
5. Use diagnostic scripts to identify root cause
6. Implement recovery procedures as needed

## Common Operational Tasks

### Manual Lead Polling
To manually trigger lead importation outside the regular cron schedule:

```bash
curl -X POST http://localhost:3000/api/cron/poll-leads
```

This will import new leads from the legacy database and send initial notifications.

### Checking Follow-Up Statistics
To monitor the status of pending follow-ups:

```bash
curl http://localhost:3000/api/cron/send-followups
```

This returns statistics on pending, due, and completed follow-ups.

### Database Backup
To create a database backup:

```bash
./scripts/backup-database.sh
```

This creates a timestamped SQL dump file in the backups directory.

### Disaster Recovery
To restore from a database backup:

```bash
./scripts/disaster-recovery.sh /path/to/backup.sql
```

This restores the database from the specified backup file.

### Scheduler Management
To ensure the scheduler is running:

```bash
./scripts/ensure-scheduler-running.sh
```

This script checks if the scheduler is active and starts it if necessary.

To manually start the scheduler:

```bash
node ./scripts/start-scheduler.mjs
```

This initiates the background job scheduler process.