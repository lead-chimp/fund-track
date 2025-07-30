/**
 * Tests for ErrorBoundary components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, ApiErrorBoundary, withErrorBoundary, useErrorHandler } from '../ErrorBoundary';

// Mock client logger
jest.mock('@/lib/client-logger', () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Component that works normally
const WorkingComponent: React.FC = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should render default error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError message="Custom error message" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Custom error message',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError message="Development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should show error ID for tracking', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/Please include this ID when reporting the issue/)).toBeInTheDocument();
  });
});

describe('ApiErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ApiErrorBoundary>
        <WorkingComponent />
      </ApiErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should render API-specific error UI when error occurs', () => {
    render(
      <ApiErrorBoundary>
        <ThrowError />
      </ApiErrorBoundary>
    );

    expect(screen.getByText('Unable to load data')).toBeInTheDocument();
    expect(screen.getByText(/There was a problem loading the requested information/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom API error</div>;

    render(
      <ApiErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ApiErrorBoundary>
    );

    expect(screen.getByText('Custom API error')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(WorkingComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should use custom fallback', () => {
    const customFallback = <div>HOC custom error</div>;
    const WrappedComponent = withErrorBoundary(ThrowError, customFallback);

    render(<WrappedComponent />);

    expect(screen.getByText('HOC custom error')).toBeInTheDocument();
  });

  it('should call custom onError callback', () => {
    const onError = jest.fn();
    const WrappedComponent = withErrorBoundary(ThrowError, undefined, onError);

    render(<WrappedComponent />);

    expect(onError).toHaveBeenCalled();
  });

  it('should set correct display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';
    
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});

describe('useErrorHandler hook', () => {
  const TestComponent: React.FC = () => {
    const handleError = useErrorHandler();
    
    const triggerError = () => {
      const error = new Error('Test async error');
      const errorId = handleError(error, { component: 'TestComponent' });
      return errorId;
    };

    return (
      <button onClick={triggerError} data-testid="trigger-error">
        Trigger Error
      </button>
    );
  };

  it('should handle async errors', () => {
    const { clientLogger } = require('@/lib/client-logger');
    
    render(<TestComponent />);
    
    const button = screen.getByTestId('trigger-error');
    button.click();

    expect(clientLogger.error).toHaveBeenCalledWith(
      'Async error in component',
      expect.objectContaining({
        message: 'Test async error',
      }),
      expect.objectContaining({
        errorId: expect.any(String),
        category: 'async_error',
        component: 'TestComponent',
      })
    );
  });
});