# Fund Track App

An internal web application for managing leads and automating intake workflows for Fund Track.

## Features

- **Lead Management**: Automated import from legacy MS SQL Server database
- **Intake Workflow**: Multi-step application process for prospects
- **Document Management**: File uploads to Backblaze B2 storage
- **Automated Notifications**: Email and SMS via MailGun and Twilio
- **Staff Dashboard**: Comprehensive lead tracking and management interface

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Backblaze B2
- **Notifications**: Twilio (SMS), MailGun (Email)
- **Monitoring**: Local error tracking and performance monitoring
- **Logging**: Winston for structured logging
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- MS SQL Server (legacy database access)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables in `.env.local`

5. Run the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

See `.env.example` for all required environment variables. Key configurations include:

- Database connections (PostgreSQL and MS SQL Server)
- External service APIs (Twilio, MailGun, Backblaze B2)
- Authentication secrets
- Application URLs and settings

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utility functions and configurations
├── services/            # Business logic and external integrations
└── types/               # TypeScript type definitions
```

## Monitoring and Error Tracking

The application includes comprehensive monitoring and error tracking:

### Local Monitoring

- **Error Tracking**: Local error logging and tracking
- **Performance Monitoring**: API route performance tracking
- **User Context**: User information attached to error reports
- **Custom Breadcrumbs**: Detailed operation tracking

### Usage Examples

```typescript
import { trackError, trackPerformance } from '@/lib/monitoring';

// Track custom errors (logged locally)
trackError({
  name: 'custom_error',
  error: new Error('Something went wrong'),
  timestamp: Date.now(),
  context: { userId: '123', action: 'data_processing' }
});

// Wrap API handlers with performance monitoring
export const GET = withPerformanceMonitoring('api_handler_name', async () => {
  // Your API logic here
});
```

### Health Checks

- **Endpoint**: `/api/health` - Comprehensive health status
- **Database**: Connection and query performance
- **Memory**: Usage monitoring and alerts
- **External Services**: Twilio, MailGun, Backblaze status

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Dokploy Deployment

This application is deployed using Dokploy with Railpack build system. The deployment includes:

- **Automated Database Migrations**: Migrations run automatically during deployment
- **Prisma Client Generation**: Database client is generated during build phase
- **Environment Management**: Production environment variables managed by Dokploy

#### Deployment Process

1. Push code to your repository
2. Dokploy automatically builds and deploys via Railpack
3. Database migrations run automatically before app starts
4. Application becomes available at your configured domain

For detailed deployment information, see:

- [`docs/DOKPLOY_MIGRATIONS.md`](docs/DOKPLOY_MIGRATIONS.md) - Database migration automation
- [`docs/DOKPLOY_SETUP.md`](docs/DOKPLOY_SETUP.md) - Initial deployment setup
- [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) - Production deployment guide

## License

Private - Internal use only
