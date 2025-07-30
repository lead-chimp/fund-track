# Implementation Plan

- [x] 1. Set up project foundation and core infrastructure
  - Initialize Next.js 14 project with TypeScript and App Router
  - Configure Tailwind CSS for styling
  - Set up environment variables structure for all external services
  - _Requirements: All requirements need foundational setup_

- [x] 2. Configure database and ORM setup
  - Install and configure Prisma ORM with PostgreSQL
  - Create complete Prisma schema with all models (User, Lead, LeadNote, Document, FollowupQueue, NotificationLog)
  - Generate Prisma client and run initial migration
  - Create database seed script with sample users and test data
  - _Requirements: 1.3, 2.2, 6.1, 7.2_

- [x] 3. Implement authentication system
  - Install and configure NextAuth.js with database adapter
  - Create user authentication API routes (/api/auth/signin, /api/auth/signout, /api/auth/session)
  - Implement password hashing with bcrypt
  - Create login page component with form validation
  - Build role-based access control middleware for protecting routes
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 4. Build core lead management API endpoints
  - Create GET /api/leads endpoint with filtering, search, and pagination
  - Implement GET /api/leads/[id] for individual lead details
  - Build PUT /api/leads/[id] for updating lead status and information
  - Add proper error handling and validation for all lead endpoints
  - Write unit tests for lead API endpoints
  - _Requirements: 1.3, 6.2, 6.3, 8.1, 8.2, 8.3_

- [x] 5. Implement legacy database integration service
  - Create MS SQL Server connection utility for legacy LeadData2 database
  - Build LeadPoller service to query Leads table filtering by CampaignID
  - Implement data transformation from legacy format to application format
  - Create lead import logic that avoids duplicates using legacy_lead_id
  - Add error handling and logging for database polling operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Create notification services integration
  - Install and configure Twilio SDK for SMS notifications
  - Install and configure MailGun SDK for email notifications
  - Build unified NotificationService with email and SMS methods
  - Implement retry logic with exponential backoff for failed notifications
  - Create notification logging to track delivery status and errors
  - Write unit tests for notification services with mocked APIs
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7. Build intake token system and workflow foundation
  - Create TokenService for generating secure intake tokens
  - Implement token validation and expiration logic
  - Build GET /api/intake/[token] endpoint to retrieve intake session data
  - Create intake token generation when leads are imported
  - Add database fields and logic for tracking intake progress
  - _Requirements: 3.1, 3.7_

- [x] 8. Implement automated lead import and notification trigger
  - Create background job using node-cron for periodic lead polling
  - Build POST /api/cron/poll-leads endpoint for manual triggering
  - Implement automatic email and SMS sending when new leads are imported
  - Set lead status to "pending" and generate intake tokens for new leads
  - Add comprehensive logging for the automated import process
  - _Requirements: 1.4, 3.1, 6.1_

- [x] 9. Build intake workflow Step 1 (data collection)
  - Create intake page component at /application/[token] route
  - Build Step 1 form with pre-filled data from lead information
  - Implement form validation and error handling
  - Create POST /api/intake/[token]/step1 endpoint to save step 1 data
  - Add "Save and continue later" functionality with progress tracking
  - Write tests for Step 1 form submission and validation
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 10. Configure Backblaze B2 file storage integration
  - Install Backblaze B2 SDK and configure connection
  - Create FileUploadService with upload, download, and delete methods
  - Implement file validation (type, size, format restrictions)
  - Build secure file URL generation for downloads
  - Add error handling for file operations and storage failures
  - Write unit tests for file upload service with mocked B2 API
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 11. Build intake workflow Step 2 (document upload)
  - Create Step 2 component for document upload interface
  - Implement drag-and-drop file upload with progress indicators
  - Build POST /api/intake/[token]/step2 endpoint for document processing
  - Add validation to ensure exactly 3 documents are uploaded
  - Create document metadata storage in database
  - Implement completion flow and confirmation page display
  - _Requirements: 3.4, 3.6, 5.1, 5.5_

- [x] 12. Implement follow-up automation system
  - Create FollowUpScheduler service for managing automated follow-ups
  - Build follow-up queue management with 3h, 9h, 24h, 72h intervals
  - Implement POST /api/cron/send-followups endpoint for processing queue
  - Add logic to cancel follow-ups when lead status changes from "pending"
  - Create background job scheduling for follow-up processing
  - Write tests for follow-up scheduling and cancellation logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 13. Build staff dashboard interface
  - Create protected dashboard page with authentication guard
  - Implement lead list component with search and filter functionality
  - Build search interface for name, phone, email, date range, and status filtering
  - Add pagination and sorting capabilities for lead list
  - Create responsive design with Tailwind CSS
  - Write tests for dashboard search and filter functionality
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 14. Implement lead detail view and management
  - Create lead detail page component with comprehensive lead information
  - Build status update interface with dropdown and immediate save
  - Display all lead documents with download links
  - Show chronological list of internal notes
  - Add role-based access controls for different user permissions
  - Write tests for lead detail view and status updates
  - _Requirements: 6.2, 6.3, 6.4, 8.3, 8.4_

- [x] 15. Build notes management system
  - Create POST /api/leads/[id]/notes endpoint for adding internal notes
  - Build notes input component with rich text formatting
  - Implement notes display with author, timestamp, and content
  - Add real-time notes updates and proper sorting
  - Create notes validation and character limits
  - Write tests for notes creation and display functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Implement staff file upload functionality
  - Create POST /api/leads/[id]/files endpoint for staff document uploads
  - Build file upload interface for staff to add documents to leads
  - Implement file type validation and size restrictions
  - Add file management interface with delete capabilities
  - Create audit logging for staff file operations
  - Write tests for staff file upload and management
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 17. Add comprehensive error handling and logging
  - Implement structured logging with Winston or similar logging library
  - Create error boundary components for React error handling
  - Add API error response standardization across all endpoints
  - Implement database error handling and connection retry logic
  - Create error monitoring and alerting for critical failures
  - Write tests for error handling scenarios
  - _Requirements: All requirements need proper error handling_

- [x] 18. Build status change automation and triggers
  - Implement status change triggers that cancel follow-up communications
  - Create audit logging for all status changes with user tracking
  - Add validation for valid status transitions
  - Build status change notification system for staff
  - Create status history tracking for leads
  - Write tests for status change logic and follow-up cancellation
  - _Requirements: 4.5, 6.4, 6.5_

- [ ] 19. Create comprehensive test suite
  - Set up Jest and React Testing Library for unit testing
  - Create integration tests for API endpoints with test database
  - Build end-to-end tests with Playwright for complete workflows
  - Add test coverage reporting and minimum coverage requirements
  - Create mock services for external APIs (Twilio, MailGun, B2)
  - Implement continuous integration test pipeline
  - _Requirements: All requirements need comprehensive testing_

- [ ] 20. Implement production deployment configuration
  - Configure environment variables for production deployment
  - Set up database migration scripts for production
  - Implement security headers and HTTPS enforcement
  - Create health check endpoints for monitoring
  - Add performance monitoring and error tracking
  - Configure backup and disaster recovery procedures
  - _Requirements: All requirements need production-ready deployment_