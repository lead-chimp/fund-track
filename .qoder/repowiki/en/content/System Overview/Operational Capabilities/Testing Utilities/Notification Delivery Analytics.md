# Notification Delivery Analytics

<cite>
**Referenced Files in This Document**   
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)
- [migration.sql](file://prisma/migrations/20240101000000_init/migration.sql)
- [NotificationService.ts](file://src/services/NotificationService.ts)
- [SystemSettingsService.ts](file://src/services/SystemSettingsService.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Script Overview and Functionality](#script-overview-and-functionality)
3. [NotificationLog Table Schema](#notificationlog-table-schema)
4. [Data Extraction Process](#data-extraction-process)
5. [Aggregation Logic and Key Metrics](#aggregation-logic-and-key-metrics)
6. [Report Generation Workflow](#report-generation-workflow)
7. [Usage Examples and Filtering Options](#usage-examples-and-filtering-options)
8. [Sample Output and Results Interpretation](#sample-output-and-results-interpretation)
9. [Analytical Applications](#analytical-applications)
10. [Performance Considerations](#performance-considerations)
11. [Scheduling Regular Analysis](#scheduling-regular-analysis)

## Introduction
The `run_notification_log_analysis.sh` script provides comprehensive analytical insights into notification delivery performance within the fund-track application. This document details the script's functionality, data processing methodology, and practical applications for system optimization and communication effectiveness measurement. The analysis focuses on extracting and aggregating data from the NotificationLog table to generate actionable reports on delivery success rates, channel performance, timing patterns, and failure identification.

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)

## Script Overview and Functionality
The `run_notification_log_analysis.sh` script is a Bash utility designed to execute diagnostic queries against the production database to analyze notification delivery data. It generates comprehensive reports by extracting and aggregating data from the NotificationLog table, providing insights into system performance and communication effectiveness.

The script requires the `DATABASE_URL` environment variable to be set with the production database connection string. By default, it skips heavy queries involving `COUNT(*)` operations for performance reasons, but this behavior can be overridden with the `--include-heavy` flag. The script outputs results to a timestamped text file in the current directory, following the naming pattern `notification_log_report_YYYYMMDD_HHMMSS.txt`.

```mermaid
flowchart TD
Start([Script Execution]) --> ValidateEnv["Validate DATABASE_URL"]
ValidateEnv --> CheckFlag["Check --include-heavy Flag"]
CheckFlag --> GenerateFilename["Generate Timestamped Filename"]
GenerateFilename --> WriteHeader["Write Report Header"]
WriteHeader --> ExecuteQueries["Execute Diagnostic Queries"]
ExecuteQueries --> HeavyQueryCheck{"INCLUDE_HEAVY=1?"}
HeavyQueryCheck --> |Yes| ExecuteHeavy["Execute COUNT(*) Queries"]
HeavyQueryCheck --> |No| SkipHeavy["Skip COUNT(*) Queries"]
ExecuteHeavy --> ExecuteStandard["Execute Standard Queries"]
SkipHeavy --> ExecuteStandard
ExecuteStandard --> WriteResults["Write Query Results to File"]
WriteResults --> Complete["Report Generation Complete"]
```

**Diagram sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L1-L20)

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)

## NotificationLog Table Schema
The NotificationLog table serves as the primary data source for the analysis script, storing comprehensive records of all notification attempts within the system. The table schema, defined in the initial database migration, includes essential fields for tracking notification delivery status, recipient information, and technical details.

```sql
CREATE TABLE "notification_log" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER,
    "type" "notification_type" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);
```

The table includes foreign key relationships to the leads table through the `lead_id` field, enabling correlation between notifications and specific leads. The `type` field uses the `notification_type` enum with values 'email' and 'sms', while the `status` field uses the `notification_status` enum with values 'pending', 'sent', and 'failed'. Additional indexes have been added to optimize query performance, particularly the `idx_notification_log_created_at_id` index on the `created_at` and `id` columns for efficient pagination.

**Diagram sources**
- [migration.sql](file://prisma/migrations/20240101000000_init/migration.sql#L91-L104)

**Section sources**
- [migration.sql](file://prisma/migrations/20240101000000_init/migration.sql#L91-L132)

## Data Extraction Process
The script extracts data from the NotificationLog table through a series of PostgreSQL queries executed via the `psql` command-line tool. Each query is wrapped in the `run_query` function, which formats the output with query metadata and appends results to the report file.

The data extraction process begins with validation of the `DATABASE_URL` environment variable, ensuring the script can connect to the production database. The script then determines whether to include heavy queries based on the presence of the `--include-heavy` flag. All queries are executed read-only, with error stopping enabled (`-v ON_ERROR_STOP=1`) to ensure data integrity and prevent partial report generation.

Key extraction queries include:
- Status distribution analysis to identify delivery success rates
- Temporal analysis of notification volume over the past 30 days
- Identification of top recipients and lead IDs by notification count
- Detection of duplicate external IDs that may indicate integration issues
- Database storage metrics including table and index sizes
- Sample recent rows for quick inspection of current notification patterns

```mermaid
sequenceDiagram
participant Script as run_notification_log_analysis.sh
participant Function as run_query()
participant Database as PostgreSQL
participant Report as Output File
Script->>Function : Execute query with SQL and description
Function->>Database : psql with DATABASE_URL and query
Database-->>Function : Query results
Function->>Report : Append query metadata and results
Script->>Script : Continue with next query
```

**Diagram sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L25-L35)

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L25-L65)

## Aggregation Logic and Key Metrics
The script implements sophisticated aggregation logic to transform raw notification data into meaningful analytical metrics. These aggregations provide insights into system performance, delivery effectiveness, and potential integration issues.

### Delivery Success Rates
The primary metric for measuring communication effectiveness is the delivery success rate, calculated by grouping notifications by their status:

```sql
SELECT status, count(*) as cnt FROM notification_log GROUP BY status ORDER BY cnt DESC;
```

This query reveals the distribution of notifications across the three possible statuses: 'pending', 'sent', and 'failed'. A high proportion of 'sent' notifications indicates effective delivery, while a significant number of 'failed' notifications warrants investigation into delivery issues.

### Channel Performance Comparison
The script enables channel performance comparison by analyzing the `type` field in the NotificationLog table. Although not explicitly queried in the current script version, this data is available for analysis and can be incorporated to compare email versus SMS delivery success rates, volume, and failure patterns.

### Timing Analysis
Temporal patterns in notification delivery are analyzed through daily volume tracking:

```sql
SELECT date(created_at) AS day, count(*) AS cnt FROM notification_log WHERE created_at >= now() - interval '30 days' GROUP BY day ORDER BY day DESC;
```

This query identifies trends in notification volume over time, helping to detect usage patterns, system load variations, and potential issues related to specific time periods.

### Failure Pattern Identification
The script identifies potential integration issues through duplicate external ID detection:

```sql
SELECT external_id, count(*) as cnt FROM notification_log WHERE external_id IS NOT NULL GROUP BY external_id HAVING count(*) > 1 ORDER BY cnt DESC LIMIT 50;
```

Duplicate external IDs may indicate problems with third-party service integration or notification retry logic. Additionally, the script provides access to error messages through sample recent rows, enabling quick identification of common failure reasons.

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L40-L60)

## Report Generation Workflow
The report generation workflow follows a systematic process to ensure comprehensive and consistent analytical output. The workflow begins with environment validation and configuration setup, followed by sequential execution of diagnostic queries.

The workflow steps are:
1. Validate that `DATABASE_URL` is set
2. Process command-line arguments for heavy query inclusion
3. Generate a timestamped output filename
4. Write report header with generation timestamp
5. Execute queries in order of computational complexity
6. Format and append results to the output file
7. Complete with success message

Each query result is prefixed with a separator and query description, making the report easy to parse and analyze. The script uses the `run_query` function to standardize output formatting, ensuring consistency across all query results.

```mermaid
flowchart TD
A[Start Script] --> B[Validate DATABASE_URL]
B --> C{Check --include-heavy Flag}
C --> |Present| D[Set INCLUDE_HEAVY=1]
C --> |Absent| E[Set INCLUDE_HEAVY=0]
D --> F[Generate Output Filename]
E --> F
F --> G[Write Report Header]
G --> H[Execute Heavy Queries if Enabled]
H --> I[Execute Standard Queries]
I --> J[Write Results to File]
J --> K[Complete Report Generation]
```

**Diagram sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh#L1-L65)

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)

## Usage Examples and Filtering Options
The script provides flexible usage options to accommodate different analytical needs and performance requirements.

### Basic Usage
```bash
DATABASE_URL="postgres://user:password@host:port/database" ./scripts/analysis/run_notification_log_analysis.sh
```

This basic invocation generates a report with standard queries while skipping heavy `COUNT(*)` operations for faster execution.

### Including Heavy Queries
```bash
DATABASE_URL="postgres://user:password@host:port/database" ./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

The `--include-heavy` flag enables comprehensive row counting queries, providing additional metrics like average bytes per row, at the cost of increased execution time.

### Custom Database Connection
```bash
export DATABASE_URL="postgres://production_user:production_password@production_host:5432/production_db"
./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

The `DATABASE_URL` can be set as an environment variable for convenience when running multiple analyses.

### Output Location
The script generates output in the current working directory with a timestamped filename. To specify a different location, run the script from the desired directory:

```bash
cd /path/to/reports
DATABASE_URL="..." ./scripts/analysis/run_notification_log_analysis.sh
```

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)

## Sample Output and Results Interpretation
The generated report follows a structured format with clear section headers and query descriptions. A sample report output includes:

```
Notification log analysis report
Generated: Mon, 01 Jan 2024 12:00:00 UTC

---
Query: Total rows
 metric  |  value  
---------+---------
total_rows| 1523478

---
Query: Rows by status
  status  |  cnt  
----------+-------
sent      | 1420356
failed    |  98765
pending   |   4357

---
Query: Rows per day (30d)
    day     |  cnt  
------------+-------
2024-01-01  |  52345
2023-12-31  |  49876
...
```

### Results Interpretation
- **Delivery Success Rate**: Calculate as (sent / (sent + failed)) * 100. In the example, this is (1,420,356 / (1,420,356 + 98,765)) * 100 = 93.5% success rate.
- **Failure Analysis**: Examine the top failure reasons from sample rows and error messages to identify common issues.
- **Volume Trends**: Analyze daily volume patterns to identify peak usage times and potential system load issues.
- **Recipient Patterns**: Review top recipients to ensure notifications are being sent to valid addresses and identify potential spam patterns.
- **Storage Metrics**: Monitor table and index sizes to plan for database capacity and optimization.

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)

## Analytical Applications
The analytical reports generated by this script serve multiple purposes for system optimization, integration issue identification, and communication effectiveness measurement.

### System Optimization
The performance metrics enable proactive system optimization:
- **Database Performance**: Table and index size metrics help identify when vacuuming, reindexing, or partitioning may be beneficial.
- **Resource Planning**: Notification volume trends inform capacity planning for notification services and database resources.
- **Index Effectiveness**: The presence of specific indexes can be validated against query performance.

### Integration Issue Identification
The analysis helps identify integration problems with external services:
- **Duplicate External IDs**: Indicate potential issues with third-party service integration or notification retry logic.
- **Error Message Patterns**: Reveal specific integration failures with email (Mailgun) or SMS (Twilio) providers.
- **Status Distribution**: An unusually high number of 'pending' notifications may indicate processing bottlenecks.

### Communication Effectiveness Measurement
The metrics provide insights into communication strategy effectiveness:
- **Channel Performance**: Compare email and SMS delivery rates to optimize channel selection.
- **Timing Optimization**: Identify optimal times for notification delivery based on historical success rates.
- **Content Effectiveness**: While not directly measured, delivery success rates can indirectly reflect content quality and recipient engagement.

```mermaid
graph TD
A[Notification Log Analysis] --> B[System Optimization]
A --> C[Integration Issue Identification]
A --> D[Communication Effectiveness]
B --> B1[Database Performance Tuning]
B --> B2[Resource Capacity Planning]
B --> B3[Index Optimization]
C --> C1[External Service Integration]
C --> C2[Error Pattern Detection]
C --> C3[Processing Bottleneck Identification]
D --> D1[Channel Performance Comparison]
D --> D2[Timing Optimization]
D --> D3[Delivery Success Rate Monitoring]
```

**Diagram sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)
- [NotificationService.ts](file://src/services/NotificationService.ts)

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)
- [NotificationService.ts](file://src/services/NotificationService.ts)

## Performance Considerations
When processing large datasets, several performance considerations are critical for efficient analysis:

### Query Optimization
The script implements performance-conscious design by:
- Skipping heavy `COUNT(*)` queries by default
- Using indexed fields in WHERE clauses (created_at)
- Limiting result sets for certain queries (LIMIT 50)
- Executing queries in order of computational complexity

### Database Impact
To minimize impact on production systems:
- All queries are read-only with no data modification
- No locking operations are performed
- The script avoids long-running transactions

### Large Dataset Processing
For very large notification logs:
- Consider running the analysis during off-peak hours
- Use the `--include-heavy` flag judiciously, as `COUNT(*)` operations can be resource-intensive
- Monitor database performance during analysis execution
- Consider partitioning the NotificationLog table by date for very large datasets

The NotificationLog table is indexed on `created_at DESC, id DESC` to optimize queries that filter or sort by creation time, which is the most common access pattern for analytical queries.

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)
- [migration.sql](file://prisma/migrations/20250812120000_add_notification_log_indexes/migration.sql)

## Scheduling Regular Analysis
Regular analysis runs can be scheduled using cron or similar scheduling systems to provide ongoing monitoring of notification delivery performance.

### Daily Analysis Schedule
```bash
# Run daily at 2:00 AM
0 2 * * * cd /path/to/fund-track && DATABASE_URL="..." ./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

### Weekly Analysis with Heavy Queries
```bash
# Run weekly on Sundays at 3:00 AM
0 3 * * 0 cd /path/to/fund-track && DATABASE_URL="..." ./scripts/analysis/run_notification_log_analysis.sh --include-heavy
```

### Automated Report Management
To prevent disk space issues with regular analysis:
```bash
# Run analysis and clean up old reports
0 2 * * * cd /path/to/fund-track && DATABASE_URL="..." ./scripts/analysis/run_notification_log_analysis.sh && find . -name "notification_log_report_*.txt" -mtime +30 -delete
```

The generated timestamped filenames facilitate automated processing and archiving of reports, enabling historical trend analysis and comparison over time.

**Section sources**
- [run_notification_log_analysis.sh](file://scripts/analysis/run_notification_log_analysis.sh)