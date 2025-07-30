# Requirements Document

## Introduction

The Merchant Funding App is an internal web application designed to streamline lead management for Merchant Funding staff. The system will automatically poll leads from a legacy MS SQL Server database, provide automated intake workflows with email/SMS notifications, enable document uploads to Backblaze B2, and offer comprehensive lead tracking capabilities. The application will be built using Next.js with PostgreSQL and will support both staff management and prospect intake workflows.

## Requirements

### Requirement 1: Lead Data Integration

**User Story:** As a staff member, I want the system to automatically import leads from the legacy database, so that I can manage new prospects without manual data entry.

#### Acceptance Criteria

1. WHEN the system polls the LeadData2.Leads table THEN it SHALL retrieve leads WHERE CampaignID identifies Merchant Funding leads
2. WHEN new leads are imported THEN the system SHALL NOT modify or flag records in the legacy database
3. WHEN leads are processed THEN the system SHALL store them in the PostgreSQL database with all relevant contact information
4. WHEN polling occurs THEN the system SHALL run automatically at regular intervals without manual intervention

### Requirement 2: User Authentication and Authorization

**User Story:** As an administrator, I want to control access to the system with simple role-based permissions, so that only authorized staff can manage leads.

#### Acceptance Criteria

1. WHEN a user attempts to access the staff dashboard THEN the system SHALL require authentication
2. WHEN a user logs in THEN the system SHALL verify credentials against the user database
3. WHEN a user is authenticated THEN the system SHALL assign either "admin" or "user" role permissions
4. WHEN accessing intake links THEN the system SHALL allow public access without authentication
5. IF a user has admin role THEN the system SHALL grant full access to all lead management functions
6. IF a user has user role THEN the system SHALL grant access to lead viewing and basic management functions

### Requirement 3: Automated Intake Workflow

**User Story:** As a prospect, I want to receive automated intake links and complete my application in steps, so that I can easily provide required information and documents.

#### Acceptance Criteria

1. WHEN a new lead is imported THEN the system SHALL automatically send email and SMS with intake link to processing.merchantfunding.com/application/:token
2. WHEN a prospect accesses the intake link THEN the system SHALL display Step 1 with pre-filled information from the lead data
3. WHEN Step 1 is completed THEN the system SHALL advance to Step 2 for document upload
4. WHEN Step 2 requires documents THEN the system SHALL allow upload of exactly 3 statements to Backblaze B2
5. WHEN a prospect wants to pause THEN the system SHALL provide "Save and continue later" functionality
6. WHEN all steps are completed THEN the system SHALL display a confirmation page
7. WHEN intake links are created THEN they SHALL remain accessible indefinitely until completed

### Requirement 4: Follow-up Automation

**User Story:** As a staff member, I want the system to automatically follow up with prospects who haven't completed their applications, so that we maximize conversion rates without manual effort.

#### Acceptance Criteria

1. WHEN a lead status remains "pending" THEN the system SHALL send follow-up email and SMS at 3 hours after initial contact
2. WHEN a lead status remains "pending" THEN the system SHALL send follow-up email and SMS at 9 hours after initial contact
3. WHEN a lead status remains "pending" THEN the system SHALL send follow-up email and SMS at 24 hours after initial contact
4. WHEN a lead status remains "pending" THEN the system SHALL send follow-up email and SMS at 72 hours after initial contact
5. WHEN lead status changes from "pending" THEN the system SHALL stop all scheduled follow-up communications
6. WHEN follow-ups are sent THEN the system SHALL use Twilio for SMS and MailGun for email delivery

### Requirement 5: Document Management

**User Story:** As a staff member, I want to manage documents for each lead, so that I can review uploaded files and add additional documentation as needed.

#### Acceptance Criteria

1. WHEN prospects upload documents THEN the system SHALL store files on Backblaze B2
2. WHEN staff view a lead THEN the system SHALL display all uploaded documents with download links
3. WHEN staff need to add documents THEN the system SHALL allow manual file uploads for each lead
4. WHEN files are uploaded THEN the system SHALL accept PDF, JPG, PNG, and DOCX formats
5. WHEN documents are stored THEN the system SHALL maintain file metadata including upload date and file size

### Requirement 6: Lead Status Management

**User Story:** As a staff member, I want to track and update lead statuses, so that I can monitor progress and coordinate team efforts.

#### Acceptance Criteria

1. WHEN a lead is imported THEN the system SHALL set initial status to "New"
2. WHEN staff view leads THEN the system SHALL display current status (New, In Progress, Completed, Rejected, Pending)
3. WHEN staff update status THEN the system SHALL save changes immediately
4. WHEN status changes from "pending" THEN the system SHALL stop automated follow-up communications
5. WHEN status is updated THEN the system SHALL record timestamp and user who made the change

### Requirement 7: Notes and Communication Tracking

**User Story:** As a staff member, I want to add internal notes to leads, so that I can document interactions and share information with team members.

#### Acceptance Criteria

1. WHEN staff view a lead THEN the system SHALL display all existing internal notes
2. WHEN staff add notes THEN the system SHALL save them with timestamp and author information
3. WHEN notes are displayed THEN the system SHALL show them in chronological order
4. WHEN notes are added THEN they SHALL be visible only to authenticated staff members
5. WHEN notes are saved THEN the system SHALL preserve formatting and allow multi-line text

### Requirement 8: Staff Dashboard and Search

**User Story:** As a staff member, I want to search and filter leads efficiently, so that I can quickly find specific prospects and manage my workload.

#### Acceptance Criteria

1. WHEN staff access the dashboard THEN the system SHALL display a searchable list of all leads
2. WHEN staff search THEN the system SHALL allow filtering by name, phone, email, date range, and status
3. WHEN staff select a lead THEN the system SHALL display detailed profile with contact info, files, status, and notes
4. WHEN viewing lead details THEN the system SHALL provide options to edit status, add notes, and upload files
5. WHEN search results are displayed THEN the system SHALL show relevant lead information in a clear, organized format

### Requirement 9: Notification Services Integration

**User Story:** As a system administrator, I want reliable email and SMS delivery, so that prospects receive timely communications throughout the intake process.

#### Acceptance Criteria

1. WHEN sending SMS notifications THEN the system SHALL use Twilio API for delivery
2. WHEN sending email notifications THEN the system SHALL use MailGun API for delivery
3. WHEN notifications fail THEN the system SHALL log errors and attempt retry according to service provider recommendations
4. WHEN notifications are sent THEN the system SHALL record delivery status and timestamps
5. WHEN API credentials are configured THEN the system SHALL validate connectivity during startup