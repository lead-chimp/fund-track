# Follow-Up Features

This document describes the new follow-up management features added to the Fund Track system.

## Overview

Two new features have been added to help staff manage lead follow-ups more effectively:

1. **Restart Follow-Up Sequence** - Reset and restart the automated email follow-up sequence
2. **Send One-Off Intake Email** - Send an immediate email with the intake link to a lead

## Features

### 1. Restart Follow-Up Sequence

**Location**: Lead Detail Page → Sidebar → Follow-Up Actions

**Purpose**: Allows staff to restart the automated follow-up email sequence for a lead.

**How it works**:
- Cancels any existing pending follow-ups for the lead
- Schedules new follow-ups at the standard intervals (3h, 9h, 24h, 72h)
- Only schedules new follow-ups if the lead status is PENDING
- Provides confirmation dialog to prevent accidental restarts

**Use Cases**:
- Lead requests to be contacted again after initially declining
- Staff wants to "revive" a lead that hasn't responded
- Need to reset follow-up timing after manual contact

### 2. Send One-Off Intake Email

**Location**: Lead Detail Page → Sidebar → Follow-Up Actions

**Purpose**: Sends an immediate email with the intake application link to the lead.

**How it works**:
- Sends email immediately (not scheduled)
- Works regardless of lead status
- Includes personalized intake link
- Provides confirmation dialog with recipient email
- Logs the email in the notification system

**Use Cases**:
- Staff is on a call with a lead and wants to send the link immediately
- Lead lost the original email and requests a new one
- Quick follow-up during active conversations

## Technical Implementation

### API Endpoints

#### Restart Follow-Ups
```
POST /api/leads/[id]/follow-ups
```
- Cancels existing pending follow-ups
- Schedules new follow-ups if lead status is PENDING
- Returns count of scheduled follow-ups

#### Send Intake Email
```
POST /api/leads/[id]/send-intake-email
```
- Validates lead has email and intake token
- Sends personalized email with intake link
- Returns success status and external ID

### UI Components

#### FollowUpActions Component
- Located in `src/components/dashboard/FollowUpActions.tsx`
- Integrated into the lead detail page sidebar
- Provides user-friendly interface for both features
- Includes loading states and error handling
- Shows helpful information about follow-up behavior

### Email Template

The one-off intake email includes:
- Personalized greeting using lead's first name or business name
- Clear call-to-action button
- Professional styling with company branding
- Fallback text link for accessibility
- Explanation of the application process

### Security & Permissions

- Both features require user authentication
- Available to ADMIN, USER, and SYSTEM_ADMIN roles
- Rate limiting applies to email sending
- All actions are logged in the notification system

## User Interface

The Follow-Up Actions section appears in the lead detail page sidebar and includes:

1. **Send Intake Email Button**
   - Disabled if no email or intake token available
   - Shows loading state while sending
   - Displays helpful error messages

2. **Restart Follow-Ups Button**
   - Shows warning about canceling existing follow-ups
   - Displays loading state during processing
   - Confirms successful scheduling

3. **Information Panel**
   - Explains follow-up behavior and timing
   - Notes about lead status requirements
   - Helpful tips for staff

## Monitoring & Logging

- All email sends are logged in the `notification_log` table
- Follow-up scheduling is tracked in the `followup_queue` table
- Success/failure status is recorded for troubleshooting
- Rate limiting prevents spam and abuse

## Best Practices

1. **Use Restart Follow-Ups when**:
   - Lead specifically requests to be contacted again
   - Reviving old leads that showed initial interest
   - After resolving issues that prevented application completion

2. **Use Send Intake Email when**:
   - In active conversation with a lead
   - Lead requests immediate access to application
   - Quick follow-up to phone conversations

3. **Avoid**:
   - Sending multiple one-off emails in short succession
   - Restarting follow-ups repeatedly for the same lead
   - Using these features for leads with completed applications

## Future Enhancements

Potential improvements for future versions:
- Custom email templates for different scenarios
- Scheduling one-off emails for future delivery
- Bulk actions for multiple leads
- Integration with CRM systems
- Advanced analytics on follow-up effectiveness