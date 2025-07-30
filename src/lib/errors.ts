/**
 * Standardized error handling for the application
 * Provides consistent error types and API response formatting
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly field?: string, context?: Record<string, any>) {
    super(message, { field, ...context });
  }
}

/**
 * Authentication error for unauthorized access
 */
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly code = 'AUTHENTICATION_ERROR';
  readonly isOperational = true;

  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly code = 'AUTHORIZATION_ERROR';
  readonly isOperational = true;

  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND_ERROR';
  readonly isOperational = true;

  constructor(resource: string, id?: string | number, context?: Record<string, any>) {
    super(`${resource} not found${id ? ` with id: ${id}` : ''}`, { resource, id, ...context });
  }
}

/**
 * Conflict error for duplicate resources or invalid state
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT_ERROR';
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Rate limit error for too many requests
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMIT_ERROR';
  readonly isOperational = true;

  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Database error for database-related issues
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly code = 'DATABASE_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly operation?: string, context?: Record<string, any>) {
    super(message, { operation, ...context });
  }
}

/**
 * External service error for third-party API failures
 */
export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly isOperational = true;

  constructor(
    public readonly service: string,
    message: string,
    public readonly originalError?: Error,
    context?: Record<string, any>
  ) {
    super(`${service}: ${message}`, { service, originalError: originalError?.message, ...context });
  }
}

/**
 * Internal server error for unexpected issues
 */
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly isOperational = false;

  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * File operation error for file-related issues
 */
export class FileOperationError extends AppError {
  readonly statusCode = 500;
  readonly code = 'FILE_OPERATION_ERROR';
  readonly isOperational = true;

  constructor(
    public readonly operation: string,
    message: string,
    public readonly filename?: string,
    context?: Record<string, any>
  ) {
    super(`File ${operation} failed: ${message}`, { operation, filename, ...context });
  }
}

/**
 * Standardized API error response interface
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(
  error: AppError | Error,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.context,
        timestamp,
        requestId,
      },
    };

    // Log operational errors as warnings, non-operational as errors
    if (error.isOperational) {
      logger.warn('Operational error occurred', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context: error.context,
        requestId,
      });
    } else {
      logger.error('Non-operational error occurred', error, {
        code: error.code,
        statusCode: error.statusCode,
        context: error.context,
        requestId,
      });
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle unexpected errors
  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      timestamp,
      requestId,
    },
  };

  logger.error('Unexpected error occurred', error, { requestId });

  return NextResponse.json(response, { status: 500 });
}

/**
 * Error handler middleware for API routes
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ApiErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Generate request ID for tracking
      const requestId = Math.random().toString(36).substring(2, 15);
      
      if (error instanceof AppError) {
        return createErrorResponse(error, requestId);
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any;
        
        switch (prismaError.code) {
          case 'P2002':
            return createErrorResponse(
              new ConflictError('Resource already exists', { 
                field: prismaError.meta?.target?.[0] 
              }),
              requestId
            );
          case 'P2025':
            return createErrorResponse(
              new NotFoundError('Resource', undefined, { 
                operation: prismaError.meta?.cause 
              }),
              requestId
            );
          case 'P2003':
            return createErrorResponse(
              new ValidationError('Foreign key constraint failed', undefined, {
                field: prismaError.meta?.field_name
              }),
              requestId
            );
          default:
            return createErrorResponse(
              new DatabaseError('Database operation failed', prismaError.code, {
                prismaCode: prismaError.code,
                meta: prismaError.meta,
              }),
              requestId
            );
        }
      }

      // Handle other known error types
      if (error instanceof Error) {
        return createErrorResponse(new InternalServerError(error.message), requestId);
      }

      // Handle unknown errors
      return createErrorResponse(
        new InternalServerError('An unexpected error occurred'),
        requestId
      );
    }
  };
}

/**
 * Utility function to check if an error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility function to extract error details for logging
 */
export function getErrorDetails(error: unknown): Record<string, any> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}