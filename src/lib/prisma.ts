import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced Prisma client with logging and error handling
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
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
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Prisma connection check failed', error as Error);
    return false;
  }
}