// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Dynamic import for Winston (server-side only)
let winston: any = null;
let winstonLogger: any = null;

if (!isBrowser) {
  try {
    winston = require('winston');
    
    // Custom log levels for application-specific logging
    const customLevels = {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      },
      colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'white',
      },
    };

    // Add colors to winston
    winston.addColors(customLevels.colors);

    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(
        (info: any) => `${info.timestamp} ${info.level}: ${info.message}${
          info.context ? ` ${JSON.stringify(info.context)}` : ''
        }${info.stack ? `\n${info.stack}` : ''}`
      )
    );

    // Create transports based on environment
    const transports: any[] = [];

    // Always add console transport
    transports.push(
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      })
    );

    // Add file transports in production (server-side only)
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }

    // Create the logger instance
    winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      levels: customLevels.levels,
      format: logFormat,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false,
    });

    // Handle uncaught exceptions and unhandled rejections (server-side only)
    if (process.env.NODE_ENV === 'production') {
      winstonLogger.exceptions.handle(
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      );
      
      winstonLogger.rejections.handle(
        new winston.transports.File({ filename: 'logs/rejections.log' })
      );
    }
  } catch (error) {
    console.warn('Winston not available, falling back to console logging');
  }
}

/**
 * Enhanced Logger class with structured logging capabilities
 * Works in both browser and server environments
 */
class Logger {
  private winston: any;
  private isServer: boolean;

  constructor() {
    this.winston = winstonLogger;
    this.isServer = !isBrowser;
  }

  /**
   * Fallback to console logging for browser environment
   */
  private fallbackLog(level: string, message: string, context?: Record<string, any>, error?: Error): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * Log error messages with optional context and error objects
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    if (!this.isServer || !this.winston) {
      this.fallbackLog('error', message, context, error instanceof Error ? error : undefined);
      return;
    }

    const logData: any = { message, context };
    
    if (error instanceof Error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      logData.error = error;
    }

    this.winston.error(logData);
  }

  /**
   * Log warning messages with optional context
   */
  warn(message: string, context?: Record<string, any>): void {
    if (!this.isServer || !this.winston) {
      this.fallbackLog('warn', message, context);
      return;
    }
    this.winston.warn({ message, context });
  }

  /**
   * Log info messages with optional context
   */
  info(message: string, context?: Record<string, any>): void {
    if (!this.isServer || !this.winston) {
      this.fallbackLog('info', message, context);
      return;
    }
    this.winston.info({ message, context });
  }

  /**
   * Log HTTP requests and responses
   */
  http(message: string, context?: Record<string, any>): void {
    if (!this.isServer || !this.winston) {
      this.fallbackLog('info', message, context);
      return;
    }
    this.winston.http({ message, context });
  }

  /**
   * Log debug messages with optional context
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.isServer || !this.winston) {
      this.fallbackLog('debug', message, context);
      return;
    }
    this.winston.debug({ message, context });
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
   * Log database operations with structured data
   */
  database(operation: string, table?: string, duration?: number, error?: Error, context?: Record<string, any>): void {
    const logData = {
      operation,
      table,
      duration,
      ...context,
    };

    if (error) {
      this.error(`Database operation failed: ${operation}`, error, logData);
    } else {
      this.debug(`Database operation: ${operation}`, logData);
    }
  }

  /**
   * Log lead import operations with structured data
   */
  leadImport(message: string, leadId?: number | string, context?: Record<string, any>): void {
    this.info(`[LEAD_IMPORT] ${message}`, {
      leadId,
      category: 'lead_import',
      ...context,
    });
  }

  /**
   * Log notification operations with structured data
   */
  notification(message: string, type?: 'email' | 'sms', recipient?: string, context?: Record<string, any>): void {
    this.info(`[NOTIFICATION] ${message}`, {
      type,
      recipient,
      category: 'notification',
      ...context,
    });
  }

  /**
   * Log background job operations with structured data
   */
  backgroundJob(message: string, jobType?: string, context?: Record<string, any>): void {
    this.info(`[BACKGROUND_JOB] ${message}`, {
      jobType,
      category: 'background_job',
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

  /**
   * Log external service calls
   */
  externalService(service: string, operation: string, success: boolean, duration?: number, context?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    this[level](`[EXTERNAL_SERVICE] ${service} ${operation}`, {
      service,
      operation,
      success,
      duration,
      category: 'external_service',
      ...context,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(defaultContext: Record<string, any>): Logger {
    const childLogger = new Logger();
    const originalMethods = ['error', 'warn', 'info', 'http', 'debug'];
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method as keyof Logger] as Function;
      (childLogger as any)[method] = (message: string, ...args: any[]) => {
        const context = args.find(arg => typeof arg === 'object' && !arg.stack) || {};
        const mergedContext = { ...defaultContext, ...context };
        return originalMethod.call(childLogger, message, ...args.filter(arg => arg !== context), mergedContext);
      };
    });

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export interface LogContext {
  [key: string]: any;
}

export interface ApiLogContext extends LogContext {
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  userId?: string | number;
  userAgent?: string;
  ip?: string;
}

export interface DatabaseLogContext extends LogContext {
  operation?: string;
  table?: string;
  duration?: number;
  query?: string;
  params?: any[];
}

export interface ExternalServiceLogContext extends LogContext {
  service?: string;
  operation?: string;
  success?: boolean;
  duration?: number;
  statusCode?: number;
  retryCount?: number;
}