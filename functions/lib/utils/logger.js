"use strict";
/**
 * Logging utilities for Firebase Cloud Functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withErrorLogging = exports.withPerformanceLogging = exports.logger = exports.createLogger = exports.LogCategory = exports.LogLevel = void 0;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
// Log levels
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["CRITICAL"] = "critical";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Log categories
var LogCategory;
(function (LogCategory) {
    LogCategory["AUTH"] = "auth";
    LogCategory["MLM"] = "mlm";
    LogCategory["PAYMENT"] = "payment";
    LogCategory["SECURITY"] = "security";
    LogCategory["SYSTEM"] = "system";
    LogCategory["API"] = "api";
    LogCategory["DATABASE"] = "database";
    LogCategory["ADMIN"] = "admin";
    LogCategory["INCOME"] = "income";
})(LogCategory || (exports.LogCategory = LogCategory = {}));
class Logger {
    constructor(functionName = 'unknown', requestId = '') {
        this.functionName = functionName;
        this.requestId = requestId || this.generateRequestId();
    }
    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create log entry
     */
    createLogEntry(level, category, message, userId, metadata, error) {
        const logEntry = {
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
                code: error.code
            };
        }
        return logEntry;
    }
    /**
     * Write log to Firestore (for important logs)
     */
    async writeToFirestore(logEntry) {
        try {
            // Only write ERROR and CRITICAL logs to Firestore in production
            if (logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL) {
                await admin.firestore()
                    .collection('systemLogs')
                    .add(logEntry);
            }
        }
        catch (error) {
            // Fallback to console if Firestore write fails
            console.error('Failed to write log to Firestore:', error);
        }
    }
    /**
     * Write log to console with formatting
     */
    writeToConsole(logEntry) {
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
                if (config_1.isDevelopment) {
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
    async log(level, category, message, userId, metadata, error) {
        const logEntry = this.createLogEntry(level, category, message, userId, metadata, error);
        // Always write to console
        this.writeToConsole(logEntry);
        // Write to Firestore for important logs
        await this.writeToFirestore(logEntry);
    }
    /**
     * Debug level logging
     */
    async debug(category, message, userId, metadata) {
        await this.log(LogLevel.DEBUG, category, message, userId, metadata);
    }
    /**
     * Info level logging
     */
    async info(category, message, userId, metadata) {
        await this.log(LogLevel.INFO, category, message, userId, metadata);
    }
    /**
     * Warning level logging
     */
    async warn(category, message, userId, metadata) {
        await this.log(LogLevel.WARN, category, message, userId, metadata);
    }
    /**
     * Error level logging
     */
    async error(category, message, error, userId, metadata) {
        await this.log(LogLevel.ERROR, category, message, userId, metadata, error);
    }
    /**
     * Critical level logging
     */
    async critical(category, message, error, userId, metadata) {
        await this.log(LogLevel.CRITICAL, category, message, userId, metadata, error);
    }
    /**
     * Log authentication events
     */
    async logAuth(event, userId, success, metadata) {
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
    async logMLMTransaction(type, userId, amount, success, metadata) {
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
    async logSecurity(event, severity, userId, metadata) {
        let level;
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
                await admin.firestore().collection(config_1.collections.SECURITY_LOGS).add({
                    event,
                    severity,
                    userId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    functionName: this.functionName,
                    requestId: this.requestId,
                    metadata
                });
            }
            catch (error) {
                console.error('Failed to write security log:', error);
            }
        }
    }
    /**
     * Log API requests
     */
    async logAPIRequest(method, endpoint, statusCode, duration, userId, metadata) {
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
    async logDatabase(operation, collection, success, duration, userId, metadata) {
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
    async logPayment(event, amount, method, success, userId, metadata) {
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
    child(additionalContext) {
        const childLogger = new Logger(additionalContext.functionName || this.functionName, this.requestId);
        return childLogger;
    }
}
/**
 * Create logger instance
 */
const createLogger = (functionName, requestId) => {
    return new Logger(functionName, requestId);
};
exports.createLogger = createLogger;
/**
 * Default logger instance
 */
exports.logger = new Logger();
/**
 * Performance monitoring decorator
 */
const withPerformanceLogging = (target, propertyName, descriptor) => {
    const method = descriptor.value;
    descriptor.value = async function (...args) {
        const startTime = Date.now();
        const logger = (0, exports.createLogger)(propertyName);
        try {
            const result = await method.apply(this, args);
            const duration = Date.now() - startTime;
            await logger.debug(LogCategory.SYSTEM, `Function ${propertyName} completed successfully`, undefined, { duration, args: args.length });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await logger.error(LogCategory.SYSTEM, `Function ${propertyName} failed`, error, undefined, { duration, args: args.length });
            throw error;
        }
    };
    return descriptor;
};
exports.withPerformanceLogging = withPerformanceLogging;
/**
 * Error handling wrapper with logging
 */
const withErrorLogging = (fn, functionName, category = LogCategory.SYSTEM) => {
    return (async (...args) => {
        const logger = (0, exports.createLogger)(functionName);
        try {
            return await fn(...args);
        }
        catch (error) {
            await logger.error(category, `Error in ${functionName}`, error, undefined, { args: args.length });
            throw error;
        }
    });
};
exports.withErrorLogging = withErrorLogging;
//# sourceMappingURL=logger.js.map