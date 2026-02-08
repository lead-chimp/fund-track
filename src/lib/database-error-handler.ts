/**
 * Database error handling and connection retry logic
 * Provides robust error handling for Prisma and database operations
 */

// NOTE: The following types must be imported from '@prisma/client/runtime/library'.
// As of Prisma v5, PrismaClientKnownRequestError and PrismaClientUnknownRequestError
// are not exported directly from '@prisma/client'.

import type { PrismaClient } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/library";
import { logger } from "./logger";

import {
  DatabaseError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "./errors";

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay =
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof PrismaClientKnownRequestError) {
    // Retry on connection errors, timeouts, and temporary failures
    const retryableCodes = [
      "P1001", // Can't reach database server
      "P1002", // Database server timeout
      "P1008", // Operations timed out
      "P1017", // Server has closed the connection
    ];
    return retryableCodes.includes(
      (error as PrismaClientKnownRequestError).code,
    );
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    // Retry on unknown errors that might be temporary
    return true;
  }

  if (error instanceof Error) {
    // Retry on network-related errors
    const retryableMessages = [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
    ];
    return retryableMessages.some((msg) => error.message.includes(msg));
  }

  return false;
}

/**
 * Transform Prisma errors into application errors
 */
export function transformPrismaError(
  error: unknown,
  operation?: string,
): Error {
  if (error instanceof PrismaClientKnownRequestError) {
    const context = {
      prismaCode: (error as PrismaClientKnownRequestError).code,
      meta: (error as PrismaClientKnownRequestError).meta,
      operation,
    };

    switch ((error as PrismaClientKnownRequestError).code) {
      case "P2002":
        // Unique constraint violation
        const field =
          (
            (error as PrismaClientKnownRequestError).meta?.target as string[]
          )?.[0] || "field";
        return new ConflictError(`${field} already exists`, context);

      case "P2025":
        // Record not found
        return new NotFoundError("Record", undefined, context);

      case "P2003":
        // Foreign key constraint violation
        const fieldName =
          ((error as PrismaClientKnownRequestError).meta
            ?.field_name as string) || "field";
        return new ValidationError(
          `Invalid reference: ${fieldName}`,
          fieldName,
          context,
        );

      case "P2004":
        // Constraint violation
        return new ValidationError(
          "Data constraint violation",
          undefined,
          context,
        );

      case "P2011":
        // Null constraint violation
        const nullField =
          ((error as PrismaClientKnownRequestError).meta
            ?.constraint as string) || "field";
        return new ValidationError(
          `${nullField} is required`,
          nullField,
          context,
        );

      case "P2012":
        // Missing required value
        const missingField =
          ((error as PrismaClientKnownRequestError).meta?.path as string) ||
          "field";
        return new ValidationError(
          `${missingField} is required`,
          missingField,
          context,
        );

      case "P2013":
        // Missing required argument
        const requiredField =
          ((error as PrismaClientKnownRequestError).meta
            ?.argument_name as string) || "field";
        return new ValidationError(
          `${requiredField} is required`,
          requiredField,
          context,
        );

      case "P2014":
        // Invalid ID
        return new ValidationError("Invalid ID provided", undefined, context);

      case "P1001":
      case "P1002":
      case "P1008":
      case "P1017":
        // Connection/timeout errors
        return new DatabaseError(
          `Database connection error: ${(error as Error).message}`,
          operation,
          context,
        );

      default:
        return new DatabaseError(
          `Database error: ${(error as Error).message}`,
          operation,
          context,
        );
    }
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    return new DatabaseError(
      `Unknown database error: ${(error as Error).message}`,
      operation,
    );
  }

  if (error instanceof Error) {
    return new DatabaseError(
      `Database operation failed: ${error.message}`,
      operation,
    );
  }

  return new DatabaseError("Unknown database error occurred", operation);
}

/**
 * Retry wrapper for database operations with exponential backoff
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      // Log successful operation
      logger.database(operationName, undefined, duration);

      return result;
    } catch (error) {
      lastError = error;
      const duration = Date.now() - Date.now();

      // Log the error
      logger.database(operationName, undefined, duration, error as Error, {
        attempt,
        maxRetries: retryConfig.maxRetries,
      });

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt > retryConfig.maxRetries || !isRetryableError(error)) {
        break;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, retryConfig);
      logger.warn(`Retrying database operation in ${delay}ms`, {
        operation: operationName,
        attempt,
        maxRetries: retryConfig.maxRetries,
        delay,
      });

      await sleep(delay);
    }
  }

  // Transform and throw the final error
  throw transformPrismaError(lastError, operationName);
}

/**
 * Database operation wrapper with error handling and logging
 */
export async function executeDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  tableName?: string,
  enableRetry: boolean = true,
): Promise<T> {
  const startTime = Date.now();

  try {
    let result: T;

    if (enableRetry) {
      result = await withDatabaseRetry(operation, operationName);
    } else {
      result = await operation();
      const duration = Date.now() - startTime;
      logger.database(operationName, tableName, duration);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const transformedError = transformPrismaError(error, operationName);

    logger.database(operationName, tableName, duration, transformedError, {
      originalError: error instanceof Error ? error.message : String(error),
    });

    throw transformedError;
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    // Skip health check during build time or when database is not available
    if (
      process.env.SKIP_ENV_VALIDATION === "true" ||
      process.env.DATABASE_URL?.includes("placeholder") ||
      (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) ||
      typeof window !== "undefined"
    ) {
      // Client-side check
      return {
        healthy: false,
        error: "Build time or client-side - database not available",
      };
    }

    const startTime = Date.now();

    // Import prisma here to avoid circular dependencies
    const { prisma } = await import("./prisma");

    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    logger.debug("Database health check passed", { latency });

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Database health check failed", error as Error);

    return {
      healthy: false,
      error: errorMessage,
    };
  }
}

/**
 * Graceful database connection cleanup
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    const { prisma } = await import("./prisma");
    await prisma.$disconnect();
    logger.info("Database connection closed gracefully");
  } catch (error) {
    logger.error("Error closing database connection", error as Error);
  }
}

/**
 * Database transaction wrapper with error handling
 */
export async function withDatabaseTransaction<T>(
  operation: (
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
  ) => Promise<T>,
  operationName: string = "transaction",
): Promise<T> {
  return executeDatabaseOperation(async () => {
    const { prisma } = await import("./prisma");

    return prisma.$transaction(async (tx) => {
      logger.debug(`Starting database transaction: ${operationName}`);

      try {
        const result = await operation(tx);
        logger.debug(`Database transaction completed: ${operationName}`);
        return result;
      } catch (error) {
        logger.error(
          `Database transaction failed: ${operationName}`,
          error as Error,
        );
        throw error;
      }
    });
  }, `transaction:${operationName}`);
}
