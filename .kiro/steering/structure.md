# Project Structure

## Root Directory Organization

```
├── src/                    # Main application source code
├── prisma/                 # Database schema and migrations
├── docs/                   # Documentation and deployment guides
├── scripts/                # Utility and deployment scripts
└── logs/                   # Application logs
```

## Source Code Structure (`src/`)

### App Router (`src/app/`)
- **Pages**: Next.js 14 App Router file-based routing
- **API Routes**: RESTful endpoints in `api/` subdirectories
- **Layout**: Root layout with global styles and providers

```
src/app/
├── api/                    # API route handlers
│   ├── auth/              # Authentication endpoints
│   ├── leads/             # Lead management APIs
│   ├── intake/            # Intake workflow APIs
│   ├── health/            # Health check endpoints
│   ├── cron/              # Scheduled job endpoints
│   └── metrics/           # Application metrics
├── dashboard/             # Staff dashboard pages
├── application/           # Public intake workflow pages
├── auth/                  # Authentication pages
├── globals.css            # Global Tailwind styles
├── layout.tsx             # Root layout component
└── page.tsx               # Home page
```

### Components (`src/components/`)
- **Reusable UI components** organized by feature

```
src/components/
├── auth/                  # Authentication components
├── dashboard/             # Dashboard-specific components
├── intake/                # Intake workflow components
├── ErrorBoundary.tsx      # Global error boundary
└── ServerInitializer.tsx  # Server initialization
```

### Services (`src/services/`)
- **Business logic** and external service integrations
- **Service classes** for complex operations

```
src/services/
├── LeadPoller.ts          # Legacy database polling
├── TokenService.ts        # Token generation/validation
├── FileUploadService.ts   # Backblaze B2 integration
├── NotificationService.ts # Email/SMS notifications
├── FollowUpScheduler.ts   # Automated follow-ups
├── LeadStatusService.ts   # Status management
└── BackgroundJobScheduler.ts # Job scheduling
```

### Library (`src/lib/`)
- **Utility functions** and configurations
- **Database connections** and error handling

```
src/lib/
├── auth.ts                # NextAuth configuration
├── prisma.ts              # Prisma client setup
├── legacy-db.ts           # MS SQL Server connection
├── logger.ts              # Winston logging setup
├── errors.ts              # Custom error classes
├── env.ts                 # Environment validation
└── monitoring.ts          # Application monitoring
```

## Key Architectural Patterns

### API Route Structure
- Each API route follows RESTful conventions
- Error handling with custom error classes
- Authentication middleware for protected routes
- Database operations wrapped in error handlers

### Component Organization
- Feature-based component grouping
- Shared components at root level
- TypeScript interfaces in separate `types.ts` files

### Database Layer
- Prisma ORM for type-safe database operations
- Migration files in `prisma/migrations/`
- Seed data in `prisma/seed.ts`
- Database error handling abstraction

## File Naming Conventions
- **Components**: PascalCase (e.g., `LeadDashboard.tsx`)
- **API Routes**: `route.ts` in feature directories
- **Services**: PascalCase with Service suffix
- **Utilities**: camelCase with descriptive names
- **Types**: `types.ts` or `.d.ts` files

## Import Path Aliases
- `@/*` maps to `src/*` for clean imports
- Absolute imports preferred over relative paths