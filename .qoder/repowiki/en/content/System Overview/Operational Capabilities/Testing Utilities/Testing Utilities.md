# Testing Utilities

<cite>
**Referenced Files in This Document**   
- [test-legacy-db.mjs](file://scripts/test-legacy-db.mjs)
- [test-lead-polling.mjs](file://scripts/test-lead-polling.mjs)
- [test-notifications.mjs](file://scripts/test-notifications.mjs)
- [test-intake-completion.mjs](file://scripts/test-intake-completion.mjs)
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)
- [route.ts](file://src/app/api/dev/test-legacy-db/route.ts)
- [route.ts](file://src/app/api/dev/test-lead-polling/route.ts)
- [route.ts](file://src/app/api/dev/test-notifications/route.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [schema.prisma](file://prisma/schema.prisma)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Legacy Database Connectivity Test](#legacy-database-connectivity-test)
3. [Lead Polling Simulation Test](#lead-polling-simulation-test)
4. [Notification Integration Test](#notification-integration-test)
5. [Intake Workflow Completion Test](#intake-workflow-completion-test)
6. [Notification Log Analysis Script](#notification-log-analysis-script)
7. [Usage Guidance](#usage-guidance)

## Introduction
This document provides comprehensive documentation for the operational testing utilities used to validate system integrations in the fund-track application. These tools are essential for deployment validation, incident investigation, and integration testing. Each utility targets a specific integration point: database connectivity, lead import processing, notification delivery, end-to-end workflow execution, and analytical reporting. The tools are designed to be executed from the command line and provide clear output for result interpretation.

## Legacy Database Connectivity Test

The `test-legacy-db.mjs` script verifies connectivity to the MS SQL Server legacy database and tests basic CRUD operations. It serves as a critical tool for validating the connection between the application and the external legacy system that provides lead data.

The script supports four commands:
- **insert**: Creates a test record in the legacy database
- **delete**: Removes test records from both legacy and application databases
- **cleanup**: Removes related records only from the application database
- **status**: Checks for existing test records in both databases

The implementation uses environment variables (`LEGACY_DB_SERVER`, `LEGACY_DB_DATABASE`, `LEGACY_DB_USER`, `LEGACY_DB_PASSWORD`) to establish the connection. It communicates with the API endpoint `/api/dev/test-legacy-db` to perform operations.

```mermaid
sequenceDiagram
participant CLI as "test-legacy-db.mjs"
participant API as "API Route"
participant LegacyDB as "MS SQL Server"
participant AppDB as "Application Database"
CLI->>API : POST /api/dev/test-legacy-db
API->>LegacyDB : Connect using environment variables
alt Insert Operation
API->>LegacyDB : INSERT INTO [LeadData2].[dbo].[Leads]
LegacyDB-->>API : SCOPE_IDENTITY()
API-->>CLI : Success with new LeadID
end
alt Delete Operation
API->>LegacyDB : DELETE FROM [LeadData2].[dbo].[Leads]
API->>AppDB : Find related leads
API->>AppDB : Delete lead and related records
API-->>CLI : Success with cleanup details
end
alt Status Operation
API->>LegacyDB : SELECT existing test records
API->>AppDB : Find related application records
API-->>CLI : Return record counts and details
end
```

**Diagram sources**
- [test-legacy-db.mjs](file://scripts/test-legacy-db.mjs#L1-L104)
- [route.ts](file://src/app/api/dev/test-legacy-db/route.ts#L1-L341)

**Section sources**
- [test-legacy-db.mjs](file://scripts/test-legacy-db.mjs#L1-L104)
- [route.ts](file://src/app/api/dev/test-legacy-db/route.ts#L1-L341)

### Usage Examples
```bash
# Insert a test record
node scripts/test-legacy-db.mjs insert

# Check current status
node scripts/test-legacy-db.mjs status

# Clean up test records
node scripts/test-legacy-db.mjs delete
```

### Expected Output
```
Executing insert operation...
✅ Success!
Action: insert
Timestamp: 2025-08-27T15:30:45.123Z

Result Details:
{
  "message": "Test record inserted successfully",
  "newLeadId": 12345,
  "insertedValues": { ... }
}
```

The status command provides a detailed view of existing test records in both databases, which is invaluable for debugging connectivity issues or data synchronization problems.

## Lead Polling Simulation Test

The `test-lead-polling.mjs` script simulates the lead import process by triggering the test poller that checks for new leads in the legacy database. This utility validates the data transformation logic that converts raw lead data into application records.

The script supports two commands:
- **poll**: Triggers the test lead polling process
- **status**: Retrieves the configuration of the test poller

The test poller is configured to monitor campaign ID 11302, which is designated for testing purposes. When triggered, it executes the same import logic used in production, including data validation, transformation, and storage in the application database.

```mermaid
sequenceDiagram
participant CLI as "test-lead-polling.mjs"
participant API as "API Route"
participant Poller as "LeadPoller"
participant LegacyDB as "MS SQL Server"
participant AppDB as "Application Database"
CLI->>API : POST /api/dev/test-lead-polling
API->>Poller : createTestLeadPoller()
Poller->>LegacyDB : Query for new leads (CampaignID=11302)
LegacyDB-->>Poller : Return lead records
loop For each new lead
Poller->>Poller : Transform data
Poller->>AppDB : Create lead record
Poller->>AppDB : Create status history
end
Poller-->>API : Return processing results
API-->>CLI : Success with statistics
```

**Diagram sources**
- [test-lead-polling.mjs](file://scripts/test-lead-polling.mjs#L1-L104)
- [route.ts](file://src/app/api/dev/test-lead-polling/route.ts#L1-L78)

**Section sources**
- [test-lead-polling.mjs](file://scripts/test-lead-polling.mjs#L1-L104)
- [route.ts](file://src/app/api/dev/test-lead-polling/route.ts#L1-L78)

### Usage Examples
```bash
# Trigger test polling
node scripts/test-lead-polling.mjs poll

# Check poller status
node scripts/test-lead-polling.mjs status
```

### Expected Output
```
Executing poll operation...
✅ Success!
Action: poll
Timestamp: 2025-08-27T15:35:22.456Z

📊 Polling Results:
Total Processed: 3
New Leads: 3
Duplicates Skipped: 0
Errors: 0
Processing Time: 156ms
```

The output includes key metrics such as the number of leads processed, new leads created, duplicates skipped, and any errors encountered. This information is crucial for validating that the data transformation logic works correctly and for identifying any issues with the import process.

## Notification Integration Test

The `test-notifications.mjs` script verifies the Twilio and MailGun integrations by sending sample messages through the application's notification system. This utility ensures that both email and SMS delivery mechanisms are functioning correctly.

The script supports two command types:
- **email**: Sends a test email via MailGun
- **sms**: Sends a test SMS via Twilio

Each command requires a recipient, message content, and optional lead ID for tracking. The script uses environment variables (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL` for email; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS) to authenticate with the external services.

```mermaid
sequenceDiagram
participant CLI as "test-notifications.mjs"
participant API as "API Route"
participant Service as "NotificationService"
participant MailGun as "MailGun API"
participant Twilio as "Twilio API"
CLI->>API : POST /api/dev/test-notifications
API->>Service : Validate payload
alt Email Notification
Service->>MailGun : POST /messages
MailGun-->>Service : 200 OK with message ID
Service->>AppDB : Create notification_log entry
Service-->>API : Success with external ID
else SMS Notification
Service->>Twilio : POST /Messages
Twilio-->>Service : 201 Created with SID
Service->>AppDB : Create notification_log entry
Service-->>API : Success with external ID
end
API-->>CLI : Success with external ID
```

**Diagram sources**
- [test-notifications.mjs](file://scripts/test-notifications.mjs#L1-L101)
- [route.ts](file://src/app/api/dev/test-notifications/route.ts#L1-L109)

**Section sources**
- [test-notifications.mjs](file://scripts/test-notifications.mjs#L1-L101)
- [route.ts](file://src/app/api/dev/test-notifications/route.ts#L1-L109)

### Usage Examples
```bash
# Send test email
node scripts/test-notifications.mjs email "test@example.com" "Test Subject" "Test message"

# Send test SMS
node scripts/test-notifications.mjs sms "+1234567890" "Test SMS message"

# Send email with lead association
node scripts/test-notifications.mjs email "test@example.com" "Test" "Message" 123
```

### Expected Output
```
Sending email to test@example.com...
Payload: {
  "type": "email",
  "recipient": "test@example.com",
  "subject": "Test Subject",
  "message": "Test message"
}
✅ Success!
External ID: <20250827154045.12345.67890@mailgun.example.com>
Timestamp: 2025-08-27T15:40:45.123Z
```

The external ID returned by the service can be used to track the message delivery status in the external provider's dashboard, which is essential for troubleshooting delivery issues.

## Intake Workflow Completion Test

The `test-intake-completion.mjs` script validates the end-to-end intake workflow by testing the token processing logic that occurs when a business completes their application. This utility ensures that the system properly updates lead status and triggers notifications when documents are uploaded.

The script works by:
1. Finding a lead with PENDING status and valid intake token
2. If none exists, creating a test lead
3. Simulating step 2 completion (document upload)
4. Verifying that the lead status changes to IN_PROGRESS
5. Confirming that a status history entry is created

The test specifically validates the `markStep2Completed` function in the `TokenService`, which is responsible for updating the lead record, canceling pending follow-ups, and changing the lead status to alert staff that the application is ready for review.

```mermaid
flowchart TD
Start([Start Test]) --> FindLead["Find PENDING lead with intakeToken"]
FindLead --> LeadExists{"Lead exists?"}
LeadExists --> |No| CreateLead["Create test lead with PENDING status"]
LeadExists --> |Yes| UseExisting["Use existing lead"]
CreateLead --> UseLead["Use lead for testing"]
UseExisting --> UseLead
UseLead --> LogStatus["Log current status and history"]
LogStatus --> MarkStep2["Call markStep2Completed(leadId)"]
MarkStep2 --> UpdateLead["Update lead: step2CompletedAt, intakeCompletedAt"]
UpdateLead --> CancelFollowups["Cancel pending follow-ups"]
CancelFollowups --> ChangeStatus["Change status to IN_PROGRESS"]
ChangeStatus --> Verify["Verify expected changes"]
Verify --> StatusChanged{"Status = IN_PROGRESS?"}
Verify --> Step2Completed{"Step2 marked?"}
Verify --> IntakeCompleted{"Intake completed?"}
Verify --> HistoryUpdated{"History updated?"}
StatusChanged --> Results
Step2Completed --> Results
IntakeCompleted --> Results
HistoryUpdated --> Results
Results --> AllCorrect{"All changes correct?"}
AllCorrect --> |Yes| Success["✅ Test completed successfully"]
AllCorrect --> |No| Failure["❌ Some expected changes not found"]
```

**Diagram sources**
- [test-intake-completion.mjs](file://scripts/test-intake-completion.mjs#L1-L170)
- [TokenService.ts](file://src/services/TokenService.ts#L1-L312)

**Section sources**
- [test-intake-completion.mjs](file://scripts/test-intake-completion.mjs#L1-L170)
- [TokenService.ts](file://src/services/TokenService.ts#L1-L312)

### Usage Example
```bash
node scripts/test-intake-completion.mjs
```

### Expected Output
```
🧪 Testing intake completion workflow...

📋 Using test lead: Test User (Test Business LLC)
   Lead ID: 456
   Current Status: PENDING
   Step 1 Completed: Yes
   Step 2 Completed: No
   Intake Completed: No

📊 Status history before (2 entries):
   1. NULL → NEW by System (2025-08-27T15:45:00.000Z)
   2. NEW → PENDING by System (2025-08-27T15:45:01.000Z)

🚀 Simulating step 2 completion (document upload)...
✅ Step 2 marked as completed successfully

📋 Updated lead status:
   Status: PENDING → IN_PROGRESS
   Step 2 Completed: No → Yes
   Intake Completed: No → Yes

📊 Status history after (3 entries):
   1. PENDING → IN_PROGRESS by System (2025-08-27T15:45:30.000Z)
      Reason: Intake completed - documents uploaded and ready for review
   2. NULL → NEW by System (2025-08-27T15:45:00.000Z)
   3. NEW → PENDING by System (2025-08-27T15:45:01.000Z)

✅ All expected changes verified:
   ✓ Lead status changed to IN_PROGRESS
   ✓ Step 2 marked as completed
   ✓ Intake marked as completed
   ✓ Status history entry created

🎉 Test completed successfully! Staff will now be notified when documents are uploaded.
```

This comprehensive test ensures that the entire intake completion workflow functions as expected, which is critical for maintaining proper business processes.

## Notification Log Analysis Script

The `run_notification_log_analysis.sh` script generates analytical reports from notification delivery data by executing a series of diagnostic queries against the production database. This utility provides insights into notification delivery patterns, success rates, and system performance.

The script connects to the database using the `DATABASE_URL` environment variable and outputs a comprehensive report to a timestamped text file. By default, it skips heavy queries (those with `COUNT(*)`) for performance reasons, but these can be included with the `--include-heavy` flag.

The analysis includes:
- **Rows by status**: Distribution of notifications by delivery status (SENT, FAILED, PENDING)
- **Rows per day**: Daily volume of notifications over the past 30 days
- **Top recipients**: Most frequent notification recipients
- **Top lead IDs**: Leads with the most notifications
- **Duplicate external IDs**: Potential delivery issues
- **Table and index sizes**: Storage utilization
- **Indexes**: Database indexing strategy
- **Sample recent rows**: Recent notification examples

```mermaid
flowchart TD
Start([Start Script]) --> CheckEnv["Check DATABASE_URL set"]
CheckEnv --> EnvSet{"Environment set?"}
EnvSet --> |No| Error["ERROR: DATABASE_URL must be set"]
EnvSet --> |Yes| CheckFlag["Check --include-heavy flag"]
CheckFlag --> SetInclude["Set INCLUDE_HEAVY flag"]
SetInclude --> CreateFile["Create timestamped output file"]
CreateFile --> RunQueries["Execute diagnostic queries"]
subgraph Queries
direction TB
Q1["Total rows (if --include-heavy)"]
Q2["Rows by status"]
Q3["Rows per day (30d)"]
Q4["Top recipients"]
Q5["Top lead IDs by count"]
Q6["Duplicate external IDs"]
Q7["Table and index sizes"]
Q8["Avg bytes per row (if --include-heavy)"]
Q9["Indexes on notification_log"]
Q10["Sample recent rows"]
end
RunQueries --> Q1
RunQueries --> Q2
RunQueries --> Q3
RunQueries --> Q4
RunQueries --> Q5
RunQueries --> Q6
RunQueries --> Q7
RunQueries --> Q8
RunQueries --> Q9
RunQueries --> Q10
Q10 --> Complete["Report complete message"]
```

**Diagram sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L1-L65)

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L1-L65)

### Usage Examples
```bash
# Run analysis (skipping heavy queries)
DATABASE_URL="postgres://user:pass@host/db" ./scripts/analysis/run_notification_log_analysis.sh

# Include heavy COUNT queries
DATABASE_URL="postgres://user:pass@host/db" ./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

### Expected Output
```
Writing report to notification_log_report_20250827_154530.txt
Skipping heavy COUNT(*) queries. Pass --include-heavy to enable.
---
Query: Rows by status
 status | cnt 
--------+-----
 SENT   | 1234
 FAILED |   56
 PENDING|    3
(3 rows)

---
Query: Rows per day (30d)
    day     | cnt 
------------+-----
 2025-08-27 |  89
 2025-08-26 |  95
 2025-08-25 |  78
 ...

Report complete: notification_log_report_20250827_154530.txt
```

The generated report provides valuable insights for monitoring notification delivery health, identifying delivery issues, and planning system capacity.

## Usage Guidance

These testing utilities should be used in various scenarios to ensure system reliability and troubleshoot issues:

### Deployment Validation
Before and after deployments, run the full suite of tests to verify that all integrations remain functional:
```bash
# Validate all integrations
node scripts/test-legacy-db.mjs status
node scripts/test-lead-polling.mjs status  
node scripts/test-notifications.mjs email "admin@company.com" "Deployment Test" "System is operational"
```

### Incident Investigation
When investigating delivery or data synchronization issues, use the targeted tests to isolate problems:
```bash
# Check legacy database connectivity
node scripts/test-legacy-db.mjs status

# Analyze notification delivery patterns
DATABASE_URL="$PROD_DB_URL" ./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

### Integration Testing
During development, use these tools to verify that changes haven't broken existing integrations:
```bash
# Test the complete lead processing workflow
node scripts/test-legacy-db.mjs insert
node scripts/test-lead-polling.mjs poll
node scripts/test-intake-completion.mjs
```

### Best Practices
- Always run tests in non-production environments first
- Use dedicated test accounts for email and SMS testing
- Monitor the notification log analysis regularly to identify trends
- Include these tests in CI/CD pipelines for automated validation
- Use the `status` commands for non-invasive health checks

These utilities provide a comprehensive toolkit for ensuring the reliability and functionality of the system's critical integrations.