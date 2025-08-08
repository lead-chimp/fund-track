# Fund Track App — Requirements Document

## Overview

This project involves building an internal web application for Fund Track staff to manage lead intake, process documents, and track application statuses. Leads will be polled from a legacy database, and the platform will offer file uploads, notes, and administrative control over each lead’s progress.

---

## 1. Lead Intake

### 1.1 Source
- Leads are stored in a legacy MS SQL Server database:
  - **Database**: `LeadData2`
  - **Table**: `Leads`
  - **Key field**: `CampaignID` identifies Fund Track leads

### 1.2 Method
- System will **poll** the `Leads` table periodically to fetch new leads.
- Leads should **not** be marked or flagged in the legacy DB after being pulled.

---

## 2. Lead Volume & Data

- **Expected leads per day**: ~50
- **File uploads**: Average of 3 pages (~500KB) per user
- **Internal users**: < 5 staff members

---

## 3. Authentication & Access

- **Staff login required**
- No multi-factor authentication (MFA) required
- Intake links for prospects should remain **open/public**

---

## 4. File Management

- Staff can **upload documents manually** for each lead
- Files are stored on **Backblaze B2**
- Document types: PDF, images (JPG, PNG), DOCX, etc.

---

## 5. Notes & Status Tracking

- Each lead has a status (e.g., New, In Progress, Completed, Rejected)
- Staff can add **internal notes** to each lead

---

## 6. Staff Dashboard

The internal web app should have a dashboard with the following capabilities:

- Search leads by name, phone, email, date range, or status
- View detailed lead profile including:
  - Contact info
  - Uploaded files
  - Status
  - Notes
- Edit and update lead status
- Add internal notes
- Upload files

---

## 7. No Export Functions (for Phase One)

- No need for:
  - CSV exports
  - Application export bundles (reserved for Phase 2)

---

## 8. Notifications

- Use **Twilio** for SMS notifications
- Use **MailGun** for email notifications

---

## 9. Domain & Hosting

- App will be hosted on internal custom servers
- **Domain**: `fund-track.MerchantFunding.com`

---

## 10. Stack & Tech Preferences

- Stack options: **PHP or React** (developer's choice)
- Backend may be REST or GraphQL based
- Database: MS SQL Server (for legacy leads), new system may use PostgreSQL or others as needed

---

## 11. Future Enhancements (Phase Two — Not Required Now)

- Export package of application files for external funders
- Aggregated email sender
- More detailed reporting or analytics

---

## Appendix: Legacy Leads Table Structure

```sql
USE [LeadData2]
GO
CREATE TABLE [dbo].[Leads](
    [LeadID] [bigint] IDENTITY(1,1) NOT NULL,
    [PostDT] [datetime] NOT NULL,
    [CampaignID] [int] NOT NULL,
    [SourceID] [int] NOT NULL,
    [PublisherID] [int] NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
    [SignupDT] [datetime] NULL,
    [TestLead] [bit] NOT NULL,
      NULL,
      NULL,
      NULL,
    [DateID] [int] NOT NULL,
    [BirthDate] [datetime] NULL,
    [VerifiedBy] [int] NULL,
    [VerifiedOn] [datetime] NULL,
    [VerifyStatus] [int] NULL,
      NULL,
    [NetworkID] [int] NOT NULL,
    [PixelFired] [bit] NULL,
    [LeadCost] [smallmoney] NULL,
      NULL,
    [Payin] [smallmoney] NULL,
    [PayOutType] [tinyint] NULL,
    [BuyerReturned] [bit] NULL,
    [ReturnedToPublisher] [bit] NULL,
    [TLMFileID] [int] NULL,
    [TLMLeadID] [int] NULL,
    [TLMPubID] [int] NULL,
    [LCPubID] [int] NULL,
      NULL,
    CONSTRAINT [PK_Leads] PRIMARY KEY CLUSTERED ([LeadID] ASC)
)