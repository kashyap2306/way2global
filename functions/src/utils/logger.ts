/**
 * Logging utilities for Firebase Cloud Functions
 */

import * as admin from 'firebase-admin';
admin.initializeApp();
import { collections, isDevelopment } from '../config';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log categories
export enum LogCategory {
  AUTH = 'auth',
  MLM = 'mlm',
  PAYMENT = 'payment',
  SECURITY = 'security',
  SYSTEM = 'system',
  API = 'api',
  DATABASE = 'database',
  ADMIN = 'admin',
  INCOME = 'income'
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: admin.firestore.Timestamp;
  userId?: string;
  functionName?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private functionName: string;
  private requestId: string;

  constructor(functionName: string = 'unknown', requestId: string = '') {
    this.functionName = functionName;
    this.requestId = requestId || this.generateRequestId();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    userId?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const logEntry: LogEntry = {
      level,
      category,
      message,
      timestamp: admin.firestore.Timestamp.now(),
      functionName: this.functionName,
      requestId: this.requestId
    };

    if (userId) {
      logEntry.userId = userId;
    }

    if (metadata) {
      logEntry.metadata = metadata;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return logEntry;
  }

  /**
   * Write log to Firestore (for important logs)
   */
  private async writeToFirestore(logEntry: LogEntry): Promise<void> {
    try {
      // Only write ERROR and CRITICAL logs to Firestore in production
      if (logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL) {
        await admin.firestore()
          .collection('systemLogs')
          .add(logEntry);
      }
    } catch (error) {
      // Fallback to console if Firestore write fails
      console.error('Failed to write log to Firestore:', error);
    }
  }

  /**
   * Write log to console with formatting
   */
  private writeToConsole(logEntry: LogEntry): void {
    const logMessage = {
      timestamp: logEntry.timestamp.toDate().toISOString(),
      level: logEntry.level.toUpperCase(),
      category: logEntry.category.toUpperCase(),
      function: logEntry.functionName,
      requestId: logEntry.requestId,
      message: logEntry.message,
      userId: logEntry.userId,
      metadata: logEntry.metadata,
      error: logEntry.error
    };

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        if (isDevelopment) {
          console.debug(JSON.stringify(logMessage, null, 2));
        }
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logMessage, null, 2));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logMessage, null, 2));
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(JSON.stringify(logMessage, null, 2));
        break;
    }
  }

  /**
   * Main logging method
   */
  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    userId?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    const logEntry = this.createLogEntry(level, category, message, userId, metadata, error);
    
    // Always write to console
    this.writeToConsole(logEntry);
    
    // Write to Firestore for important logs
    await this.writeToFirestore(logEntry);
  }

  /**
   * Debug level logging
   */
  async debug(
    category: LogCategory,
    message: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.DEBUG, category, message, userId, metadata);
  }

  /**
   * Info level logging
   */
  async info(
    category: LogCategory,
    message: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.INFO, category, message, userId, metadata);
  }

  /**
   * Warning level logging
   */
  async warn(
    category: LogCategory,
    message: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.WARN, category, message, userId, metadata);
  }

  /**
   * Error level logging
   */
  async error(
    category: LogCategory,
    message: string,
    error?: Error,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.ERROR, category, message, userId, metadata, error);
  }

  /**
   * Critical level logging
   */
  async critical(
    category: LogCategory,
    message: string,
    error?: Error,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log(LogLevel.CRITICAL, category, message, userId, metadata, error);
  }

  /**
   * Log authentication events
   */
  async logAuth(
    event: string,
    userId: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Authentication ${event}: ${success ? 'SUCCESS' : 'FAILED'}`;
    
    await this.log(level, LogCategory.AUTH, message, userId, {
      event,
      success,
      ...metadata
    });
  }

  /**
   * Log MLM transactions
   */
  async logMLMTransaction(
    type: string,
    userId: string,
    amount: number,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `MLM ${type} transaction: ${success ? 'SUCCESS' : 'FAILED'} - $${amount}`;
    
    await this.log(level, LogCategory.MLM, message, userId, {
      transactionType: type,
      amount,
      success,
      ...metadata
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    let level: LogLevel;
    switch (severity) {
      case 'low':
        level = LogLevel.INFO;
        break;
      case 'medium':
        level = LogLevel.WARN;
        break;
      case 'high':
        level = LogLevel.ERROR;
        break;
      case 'critical':
        level = LogLevel.CRITICAL;
        break;
    }

    const message = `Security event: ${event} (${severity.toUpperCase()})`;
    
    await this.log(level, LogCategory.SECURITY, message, userId, {
      securityEvent: event,
      severity,
      ...metadata
    });

    // Also write security events to dedicated collection
    if (severity === 'high' || severity === 'critical') {
      try {
        await admin.firestore().collection(collections.SECURITY_LOGS).add({
          event,
          severity,
          userId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          functionName: this.functionName,
          requestId: this.requestId,
          metadata
        });
      } catch (error) {
        console.error('Failed to write security log:', error);
      }
    }
  }

  /**
   * Log API requests
   */
  async logAPIRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${method} ${endpoint} - ${statusCode} (${duration}ms)`;
    
    await this.log(level, LogCategory.API, message, userId, {
      method,
      endpoint,
      statusCode,
      duration,
      ...metadata
    });
  }

  /**
   * Log database operations
   */
  async logDatabase(
    operation: string,
    collection: string,
    success: boolean,
    duration?: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const durationText = duration ? ` (${duration}ms)` : '';
    const message = `Database ${operation} on ${collection}: ${success ? 'SUCCESS' : 'FAILED'}${durationText}`;
    
    await this.log(level, LogCategory.DATABASE, message, userId, {
      operation,
      collection,
      success,
      duration,
      ...metadata
    });
  }

  /**
   * Log payment events
   */
  async logPayment(
    event: string,
    amount: number,
    method: string,
    success: boolean,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Payment ${event}: ${success ? 'SUCCESS' : 'FAILED'} - $${amount} via ${method}`;
    
    await this.log(level, LogCategory.PAYMENT, message, userId, {
      paymentEvent: event,
      amount,
      method,
      success,
      ...metadata
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: { functionName?: string; userId?: string }): Logger {
    const childLogger = new Logger(
      additionalContext.functionName || this.functionName,
      this.requestId
    );
    return childLogger;
  }
}

/**
 * Create logger instance
 */
export const createLogger = (functionName: string, requestId?: string): Logger => {
  return new Logger(functionName, requestId);
};

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Performance monitoring decorator
 */
export const withPerformanceLogging = (
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) => {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();
    const logger = createLogger(propertyName);
    
    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;
      
      await logger.debug(
        LogCategory.SYSTEM,
        `Function ${propertyName} completed successfully`,
        undefined,
        { duration, args: args.length }
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logger.error(
        LogCategory.SYSTEM,
        `Function ${propertyName} failed`,
        error as Error,
        undefined,
        { duration, args: args.length }
      );
      
      throw error;
    }
  };

  return descriptor;
};

/**
 * Error handling wrapper with logging
 */
export const withErrorLogging = <T extends (...args: any[]) => any>(
  fn: T,
  functionName: string,
  category: LogCategory = LogCategory.SYSTEM
): T => {
  return (async (...args: any[]) => {
    const logger = createLogger(functionName);
    
    try {
      return await fn(...args);
    } catch (error) {
      await logger.error(
        category,
        `Error in ${functionName}`,
        error as Error,
        undefined,
        { args: args.length }
      );
      throw error;
    }
  }) as T;
};