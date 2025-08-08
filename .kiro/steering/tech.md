# Technology Stack

## Core Framework
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Node.js 18+** runtime

## Database & ORM
- **PostgreSQL** (primary database)
- **MS SQL Server** (legacy database integration)
- **Prisma ORM** with client generation
- Database migrations managed via Prisma

## Authentication & Security
- **NextAuth.js** with JWT strategy
- **bcrypt** for password hashing
- Comprehensive security headers in Next.js config
- Role-based access control (Admin/User)

## External Services
- **Backblaze B2** - File storage
- **Twilio** - SMS notifications
- **MailGun** - Email notifications
- **Winston** - Structured logging

## Styling & UI
- **Tailwind CSS** with custom color palette
- Responsive design patterns
- Custom primary/secondary color schemes

## Testing
- **Jest** - Unit testing with 80% coverage threshold
- **@testing-library/react** - Component testing
- **Playwright** - End-to-end testing
- **jsdom** test environment

## Development Tools
- **TypeScript** with strict mode
- **ESLint** with Next.js config
- **Prisma Studio** for database management

## Common Commands

### Development
```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

### Database
```bash
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run development migrations
npm run db:migrate:prod # Deploy production migrations
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio
```

### Testing
```bash
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run with coverage report
npm run test:integration # Run integration tests
npm run test:e2e        # Run Playwright e2e tests
npm run test:all        # Run all test suites
```

### Production
```bash
npm run backup:db       # Backup database
npm run health:check    # Health check endpoint
npm run security:audit  # Security audit
```

## Build Configuration
- Standalone output for production deployment
- Prisma client generation during build
- TypeScript and ESLint checks disabled in production builds
- External packages configuration for Prisma