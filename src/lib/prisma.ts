import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in a build environment or if DATABASE_URL is a placeholder
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.DATABASE_URL?.includes('placeholder') ||
  !process.env.DATABASE_URL ||
  typeof window !== 'undefined'; // Client-side check

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: isBuildTime ? undefined : {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}