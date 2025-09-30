/**
 * Logging utilities for Firebase Cloud Functions
 */
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    CRITICAL = "critical"
}
export declare enum LogCategory {
    AUTH = "auth",
    MLM = "mlm",
    PAYMENT = "payment",
    SECURITY = "security",
    SYSTEM = "system",
    API = "api",
    DATABASE = "database",
    ADMIN = "admin",
    INCOME = "income"
}
declare class Logger {
    private functionName;
    private requestId;
    constructor(functionName?: string, requestId?: string);
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Create log entry
     */
    private createLogEntry;
    /**
     * Write log to Firestore (for important logs)
     */
    private writeToFirestore;
    /**
     * Write log to console with formatting
     */
    private writeToConsole;
    /**
     * Main logging method
     */
    private log;
    /**
     * Debug level logging
     */
    debug(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Info level logging
     */
    info(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Warning level logging
     */
    warn(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Error level logging
     */
    error(category: LogCategory, message: string, error?: Error, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Critical level logging
     */
    critical(category: LogCategory, message: string, error?: Error, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log authentication events
     */
    logAuth(event: string, userId: string, success: boolean, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log MLM transactions
     */
    logMLMTransaction(type: string, userId: string, amount: number, success: boolean, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log security events
     */
    logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log API requests
     */
    logAPIRequest(method: string, endpoint: string, statusCode: number, duration: number, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log database operations
     */
    logDatabase(operation: string, collection: string, success: boolean, duration?: number, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log payment events
     */
    logPayment(event: string, amount: number, method: string, success: boolean, userId?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Create child logger with additional context
     */
    child(additionalContext: {
        functionName?: string;
        userId?: string;
    }): Logger;
}
/**
 * Create logger instance
 */
export declare const createLogger: (functionName: string, requestId?: string) => Logger;
/**
 * Default logger instance
 */
export declare const logger: Logger;
/**
 * Performance monitoring decorator
 */
export declare const withPerformanceLogging: (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Error handling wrapper with logging
 */
export declare const withErrorLogging: <T extends (...args: any[]) => any>(fn: T, functionName: string, category?: LogCategory) => T;
export {};
//# sourceMappingURL=logger.d.ts.map