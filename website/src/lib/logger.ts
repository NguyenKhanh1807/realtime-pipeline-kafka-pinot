import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Types for the unified logger
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
  timestamp?: string;
}

// Create Pino logger with custom format
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString().slice(11, 23)}"`, // Short timestamp format (HH:mm:ss.sss)
  serializers: {
    err: pino.stdSerializers.err,
  },
});

// Custom transport to format logs as requested: [short timestamp][level][correlation-id][user-id] text {metadata}
const customTransport = {
  write: (chunk: string) => {
    try {
      const logData = JSON.parse(chunk);

      // Extract components
      const shortTimestamp = logData.timestamp || new Date().toISOString().slice(11, 23);
      const level = logData.level || 'INFO';
      const correlationId = logData.correlationId || '-';
      const userId = logData.userId || '-';
      const message = logData.msg || '';
      const metadata = logData.metadata ? JSON.stringify(logData.metadata) : '{}';

      // Format as requested: [short timestamp][level][correlation-id][user-id] text {metadata}
      const formattedLog = `[${shortTimestamp}][${level}][${correlationId}][${userId}] ${message} ${metadata}`;

      // Output to console
      console.log(formattedLog);
    } catch (error) {
      // Fallback to original format if parsing fails
      console.log(chunk);
    }
  },
};

// Create logger with custom transport
const unifiedLogger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString().slice(11, 23)}"`,
  },
  customTransport
);

/**
 * Unified Logger class that provides structured logging with correlation IDs
 */
class UnifiedLogger {
  private context: LogContext = {};

  /**
   * Set default context for all subsequent logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Generate a new correlation ID
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): UnifiedLogger {
    const childLogger = new UnifiedLogger();
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    const logContext = { ...this.context, ...context };
    unifiedLogger.debug(logContext, message);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    const logContext = { ...this.context, ...context };
    unifiedLogger.info(logContext, message);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const logContext = { ...this.context, ...context };
    unifiedLogger.warn(logContext, message);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const logContext = {
      ...this.context,
      ...context,
      ...(error && { error: error.message, stack: error.stack })
    };
    unifiedLogger.error(logContext, message);
  }

  /**
   * Create a scoped logger for operations with correlation tracking
   */
  startOperation(operation: string, context?: LogContext): UnifiedLogger {
    const correlationId = context?.correlationId || UnifiedLogger.generateCorrelationId();
    const operationLogger = this.child({
      correlationId,
      operation,
      ...context
    });

    operationLogger.info(`Starting operation: ${operation}`);
    return operationLogger;
  }

  /**
   * End an operation (logs completion)
   */
  endOperation(result?: 'success' | 'failure', additionalContext?: LogContext): void {
    const status = result || 'completed';
    this.info(`Operation completed: ${status}`, additionalContext);
  }
}

// Export singleton instance
export const unifiedLoggerInstance = new UnifiedLogger();

// Export convenience functions for direct usage
export const log = {
  debug: (message: string, context?: LogContext) => unifiedLoggerInstance.debug(message, context),
  info: (message: string, context?: LogContext) => unifiedLoggerInstance.info(message, context),
  warn: (message: string, context?: LogContext) => unifiedLoggerInstance.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => unifiedLoggerInstance.error(message, error, context),
  setContext: (context: LogContext) => unifiedLoggerInstance.setContext(context),
  clearContext: () => unifiedLoggerInstance.clearContext(),
  child: (context: LogContext) => unifiedLoggerInstance.child(context),
  startOperation: (operation: string, context?: LogContext) => unifiedLoggerInstance.startOperation(operation, context),
  endOperation: (result?: 'success' | 'failure', context?: LogContext) => unifiedLoggerInstance.endOperation(result, context),
  generateCorrelationId: () => UnifiedLogger.generateCorrelationId(),
};

// Export the class for advanced usage
export { UnifiedLogger };

// Default export for convenience
export default log;

// React hook for using the logger in components
export function useLogger(context?: LogContext) {
  const loggerInstance = context ? unifiedLoggerInstance.child(context) : unifiedLoggerInstance;

  return {
    debug: (message: string, ctx?: LogContext) => loggerInstance.debug(message, ctx),
    info: (message: string, ctx?: LogContext) => loggerInstance.info(message, ctx),
    warn: (message: string, ctx?: LogContext) => loggerInstance.warn(message, ctx),
    error: (message: string, error?: Error, ctx?: LogContext) => loggerInstance.error(message, error, ctx),
    startOperation: (operation: string, ctx?: LogContext) => loggerInstance.startOperation(operation, ctx),
    endOperation: (result?: 'success' | 'failure', ctx?: LogContext) => loggerInstance.endOperation(result, ctx),
  };
}
