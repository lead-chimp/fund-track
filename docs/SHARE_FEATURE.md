# Lead Share Feature

The Lead Share feature allows staff members to generate secure, time-limited links to share lead information and documents with external parties (such as funders) without requiring them to have system access.

## How It Works

### For Staff Members

1. **Generate Share Link**
   - Navigate to any lead detail page
   - Click the "Share Lead" button in the top-right corner
   - Click "Generate New Share Link" in the modal
   - The link is automatically copied to your clipboard
   - Share the link via email or other communication methods

2. **Manage Share Links**
   - View all active share links for a lead
   - See access statistics (creation date, access count, last accessed)
   - Copy existing links to clipboard
   - Deactivate links when no longer needed

### For External Recipients

1. **Access Shared Information**
   - Click the secure link provided by staff
   - View comprehensive lead information including:
     - Contact and business details
     - Financial information (amount requested, monthly revenue)
     - Application progress status
     - All uploaded documents
     - Recent status changes

2. **Download Documents**
   - Click "Download" on any document to save it locally
   - All original file names and formats are preserved

## Security Features

- **Time-Limited Access**: Links expire after 7 days automatically
- **Unique Tokens**: Each link uses a cryptographically secure random token
- **Access Tracking**: System logs when links are accessed and how many times
- **Deactivation**: Staff can instantly deactivate links at any time
- **No Authentication Required**: Recipients don't need system accounts
- **Search Engine Protection**: Shared pages are not indexed by search engines

## Technical Details

### Database Schema
- New `LeadShareLink` model tracks all share links
- Links are associated with specific leads and creating users
- Automatic cleanup of expired/inactive links

### API Endpoints
- `POST /api/leads/[id]/share` - Generate new share link
- `GET /api/leads/[id]/share` - List active share links
- `DELETE /api/leads/[id]/share` - Deactivate share link
- `GET /share/[token]` - Public access to shared lead
- `GET /api/share/[token]/documents/[documentId]` - Download shared documents

### Access Control
- Only authenticated staff can generate/manage share links
- Public share pages validate token and expiration before displaying content
- Document downloads through share links are secured and tracked

## Usage Examples

### Typical Workflow
1. Lead completes application and uploads bank statements
2. Staff member reviews the application
3. Staff generates share link and emails it to funder
4. Funder clicks link, reviews information, and downloads documents
5. Staff can see the funder accessed the link and when
6. After funding decision, staff deactivates the link

### Best Practices
- Generate new links for each external party
- Deactivate links immediately after they're no longer needed
- Monitor access logs to ensure appropriate usage
- Include context in emails when sharing links (lead name, purpose, etc.)

## Monitoring and Maintenance

- Share links automatically expire after 7 days
- Access is logged for audit purposes
- Inactive/expired links can be cleaned up via admin tools
- System tracks total access count and last access time for each link