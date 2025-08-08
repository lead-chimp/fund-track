# Product Overview

Fund Track is an internal web application for managing leads and automating intake workflows for a funding company.

## Core Features

- **Lead Management**: Automated import from legacy MS SQL Server database with real-time polling
- **Multi-step Intake Workflow**: Guided application process for prospects with document uploads
- **Staff Dashboard**: Comprehensive lead tracking, filtering, and management interface
- **Document Management**: Secure file uploads to Backblaze B2 cloud storage
- **Automated Notifications**: Email and SMS notifications via MailGun and Twilio
- **Status Tracking**: Lead status history and automated follow-up scheduling

## User Roles

- **Admin**: Full system access, user management
- **User**: Lead management, intake processing

## Key Business Logic

- Leads are imported from legacy database and assigned unique intake tokens
- Multi-step intake process (Step 1: Basic info, Step 2: Documents)
- Automated follow-up scheduling at 3h, 9h, 24h, and 72h intervals
- Lead status progression: NEW → PENDING → IN_PROGRESS → COMPLETED/REJECTED
- All status changes are tracked with history and user attribution