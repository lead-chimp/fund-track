import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in a build environment or if DATABASE_URL is a placeholder
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.DATABASE_URL?.includes('placeholder') ||
  !process.env.DATABASE_URL ||
  typeof window !== 'undefined'; // Client-side check

// Enhanced Prisma client with logging and error handling
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    // Don't connect to database during build time
    datasources: isBuildTime ? undefined : {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

// Connection event handlers (commented out due to type issues)
// prisma.$on('beforeExit', async () => {
//   logger.info('Prisma client disconnecting...');
// });

// Global error handler for unhandled database errors
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting Prisma client', error as Error);
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Health check utility
export async function checkPrismaConnection(): Promise<boolean> {
  try {
    // Skip connection check during build time
    if (isBuildTime) {
      return false;
    }

    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Prisma connection check failed', error as Error);
    return false;
  }
}