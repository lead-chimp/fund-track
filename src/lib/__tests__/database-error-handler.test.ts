/**
 * Tests for database error handling utilities
 */

import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import {
  transformPrismaError,
  withDatabaseRetry,
  executeDatabaseOperation,
  checkDatabaseHealth,
  withDatabaseTransaction,
} from '../database-error-handler';
import {
  DatabaseError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    database: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock prisma
jest.mock('../prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

describe('Database Error Handler', () => {
  describe('transformPrismaError', () => {
    it('should transform P2002 (unique constraint) error', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );

      const result = transformPrismaError(prismaError, 'createUser');

      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe('email already exists');
    });

    it('should transform P2025 (record not found) error', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      const result = transformPrismaError(prismaError, 'findUser');

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('Record not found');
    });

    it('should transform P2003 (foreign key constraint) error', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'userId' },
        }
      );

      const result = transformPrismaError(prismaError, 'createLead');

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid reference: userId');
    });

    it('should transform P2011 (null constraint) error', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Null constraint violation',
        {
          code: 'P2011',
          clientVersion: '5.0.0',
          meta: { constraint: 'email' },
        }
      );

      const result = transformPrismaError(prismaError, 'updateUser');

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('email is required');
    });

    it('should transform connection errors', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Connection failed',
        {
          code: 'P1001',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      const result = transformPrismaError(prismaError, 'connect');

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toContain('Database connection error');
    });

    it('should transform unknown Prisma errors', () => {
      const prismaError = new PrismaClientUnknownRequestError(
        'Unknown error',
        { clientVersion: '5.0.0' }
      );

      const result = transformPrismaError(prismaError, 'operation');

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toContain('Unknown database error');
    });

    it('should transform generic errors', () => {
      const error = new Error('Generic database error');

      const result = transformPrismaError(error, 'operation');

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toContain('Database operation failed');
    });
  });

  describe('withDatabaseRetry', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withDatabaseRetry(mockOperation, 'testOperation');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new PrismaClientKnownRequestError(
        'Connection failed',
        {
          code: 'P1001',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await withDatabaseRetry(
        mockOperation,
        'testOperation',
        { maxRetries: 3, baseDelay: 10 }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );

      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(
        withDatabaseRetry(mockOperation, 'testOperation')
      ).rejects.toBeInstanceOf(ConflictError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const retryableError = new PrismaClientKnownRequestError(
        'Connection failed',
        {
          code: 'P1001',
          clientVersion: '5.0.0',
          meta: {},
        }
      );

      const mockOperation = jest.fn().mockRejectedValue(retryableError);

      await expect(
        withDatabaseRetry(
          mockOperation,
          'testOperation',
          { maxRetries: 2, baseDelay: 10 }
        )
      ).rejects.toBeInstanceOf(DatabaseError);

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('executeDatabaseOperation', () => {
    it('should execute operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');

      const result = await executeDatabaseOperation(
        mockOperation,
        'testOperation',
        'testTable',
        false
      );

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and transform them', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );

      const mockOperation = jest.fn().mockRejectedValue(prismaError);

      await expect(
        executeDatabaseOperation(mockOperation, 'testOperation', 'testTable', false)
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when connection works', async () => {
      const { prisma } = require('../prisma');
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await checkDatabaseHealth();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when connection fails', async () => {
      const { prisma } = require('../prisma');
      prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await checkDatabaseHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.latency).toBeUndefined();
    });
  });

  describe('withDatabaseTransaction', () => {
    it('should execute transaction successfully', async () => {
      const { prisma } = require('../prisma');
      const mockTx = { user: { create: jest.fn() } };

      prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockTx);
      });

      const mockOperation = jest.fn().mockResolvedValue('transaction result');

      const result = await withDatabaseTransaction(mockOperation, 'testTransaction');

      expect(result).toBe('transaction result');
      expect(mockOperation).toHaveBeenCalledWith(mockTx);
    });

    it('should handle transaction errors', async () => {
      const { prisma } = require('../prisma');
      const error = new Error('Transaction failed');

      prisma.$transaction.mockRejectedValue(error);

      const mockOperation = jest.fn();

      await expect(
        withDatabaseTransaction(mockOperation, 'testTransaction')
      ).rejects.toBeInstanceOf(DatabaseError);
    });
  });
});