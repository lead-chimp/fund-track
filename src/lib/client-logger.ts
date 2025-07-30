/**
 * Client-side logging utility
 * Provides basic logging functionality for browser environments
 */

/**
 * Simple client-side logger that works in browser environments
 */
class ClientLogger {
  private logLevel: number;

  constructor() {
    // Set log level based on environment
    const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase();
    switch (envLogLevel) {
      case 'ERROR':
        this.logLevel = 0;
        break;
      case 'WARN':
        this.logLevel = 1;
        break;
      case 'INFO':
        this.logLevel = 2;
        break;
      case 'DEBUG':
        this.logLevel = 3;
        break;
      default:
        this.logLevel = process.env.NODE_ENV === 'production' ? 2 : 3;
    }
  }

  private shouldLog(level: number): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  /**
   * Log error messages with optional context and error objects
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    if (!this.shouldLog(0)) return;

    const logData = { ...context };
    
    if (error instanceof Error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      logData.error = error;
    }

    console.error(this.formatMessage('ERROR', message, logData));
  }

  /**
   * Log warning messages with optional context
   */
  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(1)) return;
    console.warn(this.formatMessage('WARN', message, context));
  }

  /**
   * Log info messages with optional context
   */
  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(2)) return;
    console.info(this.formatMessage('INFO', message, context));
  }

  /**
   * Log debug messages with optional context
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(3)) return;
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  /**
   * Log HTTP requests and responses
   */
  http(message: string, context?: Record<string, any>): void {
    this.info(`[HTTP] ${message}`, context);
  }

  /**
   * Log API request/response with structured data
   */
  apiRequest(method: string, url: string, statusCode?: number, duration?: number, context?: Record<string, any>): void {
    this.http('API Request', {
      method,
      url,
      statusCode,
      duration,
      ...context,
    });
  }

  /**
   * Log authentication events
   */
  auth(message: string, userId?: string | number, context?: Record<string, any>): void {
    this.info(`[AUTH] ${message}`, {
      userId,
      category: 'authentication',
      ...context,
    });
  }

  /**
   * Log file operations
   */
  fileOperation(message: string, filename?: string, operation?: string, context?: Record<string, any>): void {
    this.info(`[FILE] ${message}`, {
      filename,
      operation,
      category: 'file_operation',
      ...context,
    });
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();