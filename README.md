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

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

Private - Internal use only