# Digital Signature Workflow

<cite>
**Referenced Files in This Document**   
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx)
- [TokenService.ts](file://src/services/TokenService.ts)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The Digital Signature Workflow is a critical component of the fund-track application, enabling users to electronically sign their funding applications. This workflow ensures legal compliance, data integrity, and process completion by capturing a user's handwritten signature through a web interface. The system validates prerequisites, securely stores the signature as a base64-encoded PNG image, and triggers downstream business processes upon completion. This documentation provides a comprehensive analysis of the implementation, covering database schema, API endpoints, user interface components, and integration points.

## Project Structure
The digital signature functionality is integrated into the existing intake workflow of the fund-track application. It follows a Next.js App Router architecture with API routes handling server-side logic and React components managing the client-side user experience. The feature spans multiple directories:
- `prisma/migrations/` contains the database schema changes
- `src/components/intake/` holds the client-side React component for signature capture
- `src/app/api/intake/[token]/step3/` contains the API route for processing signature submission
- `src/components/dashboard/` includes the admin interface for viewing completed signatures
- `src/services/` contains the TokenService that manages workflow state

``mermaid
graph TB
subgraph "Client-Side"
A[Step3Form.tsx] --> B[IntakeWorkflow.tsx]
end
subgraph "Server-Side"
C[route.ts] --> D[TokenService.ts]
C --> E[prisma]
end
A --> C
D --> E
F[migration.sql] --> E
G[LeadDetailView.tsx] --> E
```

**Diagram sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx)

**Section sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx)
- [TokenService.ts](file://src/services/TokenService.ts)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql)

## Core Components
The digital signature workflow consists of several core components that work together to provide a seamless user experience:
1. **Database Schema**: The leads table was extended with three new fields to support digital signatures.
2. **Client Component**: Step3Form.tsx provides an interactive canvas for signature capture.
3. **API Endpoint**: The step3 route handles signature submission and validation.
4. **Service Layer**: TokenService manages the workflow state and business logic.
5. **Admin Interface**: LeadDetailView.tsx displays the captured signature in the admin dashboard.

These components follow a clear separation of concerns, with the client handling user interaction, the API managing data validation and persistence, and the service layer coordinating business processes.

**Section sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L1-L277)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L1-L114)
- [TokenService.ts](file://src/services/TokenService.ts#L1-L339)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql#L1-L3)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx#L800-L1000)

## Architecture Overview
The digital signature workflow follows a client-server architecture with a clear data flow from user interaction to database persistence and administrative review. The process begins when a user accesses the signature step in the intake workflow, which renders the Step3Form component. This component provides a canvas element for signature capture, converting the drawing into a base64-encoded PNG image. Upon submission, the client sends this image to the API endpoint, which validates the request and updates the database. The TokenService then marks the workflow as completed and triggers downstream processes. Finally, administrators can view the signature in the LeadDetailView component.

``mermaid
sequenceDiagram
participant User
participant Step3Form
participant API
participant TokenService
participant Database
participant Admin
User->>Step3Form : Draws signature on canvas
Step3Form->>Step3Form : Converts to base64 PNG
User->>Step3Form : Submits form
Step3Form->>API : POST /api/intake/{token}/step3
API->>API : Validates token and prerequisites
API->>API : Validates signature format
API->>Database : Update lead with signature data
API->>TokenService : markStep3Completed(leadId)
TokenService->>Database : Update step3CompletedAt and intakeCompletedAt
TokenService->>Database : Change status to IN_PROGRESS
TokenService->>API : Return success
API->>Step3Form : 200 OK
Step3Form->>User : Show completion screen
Admin->>Database : Query lead data
Database->>Admin : Return lead with digitalSignature
Admin->>Admin : Display signature in LeadDetailView
```

**Diagram sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L124-L167)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L48-L95)
- [TokenService.ts](file://src/services/TokenService.ts#L200-L250)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx#L936-L994)

## Detailed Component Analysis

### Step3Form Component Analysis
The Step3Form component provides the user interface for digital signature capture. It renders a canvas element that users can draw on with their mouse or touch input. The component handles various touch and mouse events to create a smooth drawing experience.

#### For Object-Oriented Components:
``mermaid
classDiagram
class Step3Form {
-isDrawing : boolean
-signature : string
-isSubmitting : boolean
-error : string
-canvasRef : RefObject
-lastPoint : Point | null
+useEffect() : void
+getCanvasPoint(event) : Point
+startDrawing(event) : void
+draw(event) : void
+stopDrawing() : void
+clearSignature() : void
+handleSubmit(event) : Promise~void~
+render() : JSX
}
class Point {
+x : number
+y : number
}
Step3Form --> Point : "uses"
```

**Diagram sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L1-L277)

#### For API/Service Components:
``mermaid
sequenceDiagram
participant User
participant Step3Form
participant API
User->>Step3Form : Draws signature
Step3Form->>Step3Form : Updates canvas and signature state
User->>Step3Form : Clicks Complete Application
Step3Form->>Step3Form : Validates signature exists
Step3Form->>API : POST /api/intake/{token}/step3
API-->>Step3Form : 200 OK or error
Step3Form->>User : Shows success or error message
```

**Diagram sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L124-L167)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L1-L114)

**Section sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L1-L277)

### API Route Analysis
The API route at `/api/intake/[token]/step3` handles the server-side processing of digital signature submissions. It performs comprehensive validation before persisting the signature data.

#### For API/Service Components:
``mermaid
sequenceDiagram
participant Client
participant API
participant TokenService
participant Database
Client->>API : POST /api/intake/{token}/step3
API->>TokenService : validateToken(token)
TokenService-->>API : IntakeSession or null
API->>API : Check step1Completed and step2Completed
API->>API : Check step3Completed
API->>API : Parse and validate request body
API->>API : Validate signature format (data : image/)
API->>Database : Update lead with signature data
API->>TokenService : markStep3Completed(leadId)
TokenService-->>API : boolean
API-->>Client : 200 OK or error response
```

**Diagram sources**
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L1-L114)

**Section sources**
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L1-L114)

### TokenService Analysis
The TokenService class contains the business logic for managing the intake workflow state, including marking step 3 as completed.

#### For Object-Oriented Components:
``mermaid
classDiagram
class TokenService {
+generateToken() : string
+validateToken(token) : IntakeSession | null
+generateTokenForLead(leadId) : string | null
+markStep1Completed(leadId) : boolean
+markStep2Completed(leadId) : boolean
+markStep3Completed(leadId) : boolean
+getIntakeProgress(leadId) : Progress | null
}
class IntakeSession {
+leadId : number
+token : string
+isValid : boolean
+isCompleted : boolean
+step1Completed : boolean
+step2Completed : boolean
+step3Completed : boolean
+lead : LeadData
}
class LeadData {
+id : number
+email : string | null
+phone : string | null
+firstName : string | null
+lastName : string | null
+digitalSignature : string | null
+signatureDate : Date | null
+status : string
}
TokenService --> IntakeSession : "returns"
IntakeSession --> LeadData : "contains"
```

**Diagram sources**
- [TokenService.ts](file://src/services/TokenService.ts#L1-L339)

**Section sources**
- [TokenService.ts](file://src/services/TokenService.ts#L1-L339)

## Dependency Analysis
The digital signature workflow has several key dependencies that enable its functionality:

``mermaid
graph TD
A[Step3Form.tsx] --> B[React]
A --> C[Next.js]
A --> D[TokenService]
E[route.ts] --> C
E --> D
E --> F[Prisma]
E --> G[Logger]
D --> F
D --> H[FollowUpScheduler]
D --> I[LeadStatusService]
J[LeadDetailView.tsx] --> C
J --> F
K[migration.sql] --> L[PostgreSQL]
A --> E
J --> F
```

**Diagram sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql)

**Section sources**
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx)
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts)
- [TokenService.ts](file://src/services/TokenService.ts)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx)
- [migration.sql](file://prisma/migrations/20250829134057_add_digital_signature/migration.sql)

## Performance Considerations
The digital signature workflow is designed with performance in mind. The signature is stored as a base64-encoded string directly in the leads table, avoiding the need for additional database queries or external storage systems. This approach provides fast read access when displaying the signature in the admin interface. The base64 encoding increases data size by approximately 33%, but this is acceptable given that signatures are relatively small images. The API endpoint performs validation synchronously to ensure data integrity, but these operations are lightweight and should not impact performance significantly. For high-volume scenarios, consider implementing asynchronous processing or moving signature storage to a dedicated file storage system.

## Troubleshooting Guide
Common issues with the digital signature workflow and their solutions:

1. **Signature not saving**: Ensure the client is sending a properly formatted base64 data URL starting with "data:image/png". The API validates this format strictly.

2. **Step 3 not accessible**: Verify that steps 1 and 2 have been completed. The API checks the step1Completed and step2Completed flags before allowing access to step 3.

3. **Signature appears blank**: Check that the canvas dimensions are properly set (400x200 pixels) and that the drawing context is correctly initialized with a white background.

4. **Token validation failures**: Ensure the intakeToken in the leads table matches the token in the URL. Tokens are case-sensitive.

5. **Admin interface not showing signature**: Verify that the lead record has a non-null digitalSignature field and that the LeadDetailView component is properly receiving the lead data.

6. **Performance issues with large signatures**: If signature images are unusually large, check that the canvas dimensions are constrained and that the toDataURL() method is using the PNG format without excessive quality settings.

**Section sources**
- [route.ts](file://src/app/api/intake/[token]/step3/route.ts#L48-L95)
- [Step3Form.tsx](file://src/components/intake/Step3Form.tsx#L124-L167)
- [LeadDetailView.tsx](file://src/components/dashboard/LeadDetailView.tsx#L936-L994)

## Conclusion
The digital signature workflow in the fund-track application provides a robust solution for capturing electronic signatures as part of the funding application process. The implementation follows best practices with a clear separation of concerns between client and server components. The workflow ensures data integrity through comprehensive validation and maintains audit trails through timestamped fields. The integration with the TokenService enables proper workflow management, automatically advancing the application status upon completion. This documentation provides a comprehensive understanding of the system architecture, enabling effective maintenance and future enhancements.