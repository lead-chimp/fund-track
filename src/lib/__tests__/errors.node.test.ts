/**
 * Tests for error handling utilities (Node.js environment)
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  InternalServerError,
  isOperationalError,
  getErrorDetails,
} from '../errors';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid email format', 'email');
      
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.field).toBe('email');
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource and id', () => {
      const error = new NotFoundError('Lead', 123);
      
      expect(error.message).toBe('Lead not found with id: 123');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.context).toEqual({ resource: 'Lead', id: 123 });
    });

    it('should create not found error without id', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation', () => {
      const error = new DatabaseError('Connection failed', 'findMany');
      
      expect(error.message).toBe('Connection failed');
      expect(error.operation).toBe('findMany');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.context).toEqual({ operation: 'findMany' });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const originalError = new Error('API timeout');
      const error = new ExternalServiceError('Twilio', 'Send SMS failed', originalError);
      
      expect(error.message).toBe('Twilio: Send SMS failed');
      expect(error.service).toBe('Twilio');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });
});

describe('Error Utilities', () => {
  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new ValidationError('Invalid input');
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational errors', () => {
      const error = new InternalServerError();
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Generic error');
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('getErrorDetails', () => {
    it('should extract details from AppError', () => {
      const error = new ValidationError('Invalid input', 'email');
      const details = getErrorDetails(error);
      
      expect(details).toMatchObject({
        name: 'ValidationError',
        message: 'Invalid input',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        isOperational: true,
        context: { field: 'email' },
      });
      expect(details.stack).toBeDefined();
    });

    it('should extract details from generic Error', () => {
      const error = new Error('Generic error');
      const details = getErrorDetails(error);
      
      expect(details).toMatchObject({
        name: 'Error',
        message: 'Generic error',
      });
      expect(details.stack).toBeDefined();
    });

    it('should handle non-Error objects', () => {
      const details = getErrorDetails('string error');
      
      expect(details).toEqual({
        error: 'string error',
      });
    });
  });
});