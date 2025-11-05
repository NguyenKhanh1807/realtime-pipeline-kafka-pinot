/**
 * Simple Audit Logging Service
 * Provides basic logging with correlation IDs for easier maintenance
 */

import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: AuditCategory;
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  resourceId?: string;
  operation: string;
  parameters?: Record<string, unknown>;
  result?: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  performance?: {
    duration: number;
    databaseQueries?: number;
    cacheHits?: number;
    externalCalls?: number;
  };
  compliance?: {
    gdpr?: boolean;
    pci?: boolean;
    sox?: boolean;
  };
}

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'fraud_detection'
  | 'transaction_analysis'
  | 'data_access'
  | 'user_management'
  | 'system'
  | 'security'
  | 'performance'
  | 'api'
  | 'export'
  | 'reporting';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'profile_update'
  | 'transaction_check'
  | 'fraud_alert'
  | 'data_export'
  | 'report_generation'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'role_change'
  | 'permission_grant'
  | 'permission_revoke'
  | 'system_config_change'
  | 'api_access'
  | 'query_execution'
  | 'cache_operation'
  | 'error_occurred'
  | 'security_violation';

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogsInMemory = 1000;

  constructor() {
    // Simple constructor - no OpenTelemetry setup needed
  }

  /**
   * Create a correlation ID for request tracing
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Start a traced operation with correlation ID (simplified - no actual tracing)
   */
  startOperation(
    operation: string,
    category: AuditCategory,
    correlationId?: string
  ): { span: null; correlationId: string } {
    const finalCorrelationId = correlationId || AuditLogger.generateCorrelationId();
    return { span: null, correlationId: finalCorrelationId };
  }

  /**
   * Log an audit event with full context
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...entry,
    };

    // Add to in-memory store (for development/testing)
    this.logs.push(auditEntry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift(); // Remove oldest entries
    }

    // Log to console with structured format
    const logLevel = this.getLogLevel(auditEntry.level);
    const structuredLog = {
      timestamp: new Date(auditEntry.timestamp).toISOString(),
      level: auditEntry.level.toUpperCase(),
      correlationId: auditEntry.correlationId,
      category: auditEntry.category,
      action: auditEntry.action,
      userId: auditEntry.userId,
      resource: auditEntry.resource,
      result: auditEntry.result,
      ...(auditEntry.errorMessage && { error: auditEntry.errorMessage }),
      ...(auditEntry.performance && { performance: auditEntry.performance }),
    };

    console.log(JSON.stringify(structuredLog));
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    action: 'login' | 'logout' | 'register' | 'password_change',
    userId: string,
    userEmail: string,
    result: 'success' | 'failure',
    correlationId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      level: result === 'success' ? 'info' : 'warn',
      category: 'authentication',
      action,
      userId,
      userEmail,
      resource: 'user',
      resourceId: userId,
      operation: action,
      result,
      metadata,
    });
  }

  /**
   * Log fraud detection events
   */
  async logFraudDetection(
    action: 'transaction_check' | 'fraud_alert',
    userId: string,
    transactionId: string,
    fraudScore: number,
    riskLevel: string,
    result: 'success' | 'failure',
    correlationId: string,
    performance?: { duration: number },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      level: 'info',
      category: 'fraud_detection',
      action,
      userId,
      resource: 'transaction',
      resourceId: transactionId,
      operation: action,
      result,
      performance,
      metadata: {
        fraudScore,
        riskLevel,
        ...metadata,
      },
    });
  }

  /**
   * Log data access and export events
   */
  async logDataAccess(
    action: 'data_export' | 'report_generation' | 'query_execution',
    userId: string,
    resource: string,
    result: 'success' | 'failure',
    correlationId: string,
    resourceId?: string,
    performance?: { duration: number; databaseQueries?: number },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      level: 'info',
      category: action === 'data_export' ? 'export' : 'reporting',
      action,
      userId,
      resource,
      resourceId,
      operation: action,
      result,
      performance,
      metadata,
    });
  }

  /**
   * Log user management events
   */
  async logUserManagement(
    action: 'user_create' | 'user_update' | 'user_delete' | 'role_change',
    adminUserId: string,
    targetUserId: string,
    result: 'success' | 'failure',
    correlationId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      level: 'info',
      category: 'user_management',
      action,
      userId: adminUserId,
      resource: 'user',
      resourceId: targetUserId,
      operation: action,
      result,
      metadata,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: 'security_violation' | 'permission_grant' | 'permission_revoke',
    userId: string,
    resource: string,
    result: 'success' | 'failure',
    correlationId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      level: action === 'security_violation' ? 'error' : 'warn',
      category: 'security',
      action,
      userId,
      resource,
      operation: action,
      result,
      metadata,
    });
  }

  /**
   * Log API access events
   */
  async logApiAccess(
    method: string,
    endpoint: string,
    statusCode: number,
    correlationId: string,
    userId?: string,
    performance?: { duration: number },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const result = statusCode >= 200 && statusCode < 400 ? 'success' : 'failure';

    await this.log({
      correlationId,
      level: result === 'success' ? 'info' : 'warn',
      category: 'api',
      action: 'api_access',
      userId,
      resource: 'api',
      operation: `${method} ${endpoint}`,
      result,
      performance,
      metadata: {
        method,
        endpoint,
        statusCode,
        ...metadata,
      },
    });
  }

  /**
   * Get audit logs with filtering
   */
  getLogs(filters?: {
    correlationId?: string;
    userId?: string;
    category?: AuditCategory;
    action?: AuditAction;
    level?: 'info' | 'warn' | 'error' | 'debug';
    fromDate?: number;
    toDate?: number;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.correlationId) {
        filteredLogs = filteredLogs.filter(log => log.correlationId === filters.correlationId);
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      if (filters.fromDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.toDate!);
      }
    }

    // Sort by timestamp (newest first) and apply limit
    return filteredLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, filters?.limit || 100);
  }

  /**
   * Export audit logs
   */
  exportLogs(filters?: Parameters<typeof this.getLogs>[0]): string {
    const logs = this.getLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get audit statistics
   */
  getStatistics(timeRange?: number): {
    totalLogs: number;
    logsByCategory: Record<AuditCategory, number>;
    logsByLevel: Record<string, number>;
    logsByResult: Record<string, number>;
    recentActivity: number;
  } {
    const logs = timeRange
      ? this.logs.filter(log => log.timestamp >= Date.now() - timeRange)
      : this.logs;

    const stats = {
      totalLogs: logs.length,
      logsByCategory: {} as Record<AuditCategory, number>,
      logsByLevel: {} as Record<string, number>,
      logsByResult: {} as Record<string, number>,
      recentActivity: logs.length,
    };

    logs.forEach(log => {
      // Category stats
      stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;

      // Level stats
      stats.logsByLevel[log.level] = (stats.logsByLevel[log.level] || 0) + 1;

      // Result stats
      if (log.result) {
        stats.logsByResult[log.result] = (stats.logsByResult[log.result] || 0) + 1;
      }
    });

    return stats;
  }

  private getLogLevel(level: 'info' | 'warn' | 'error' | 'debug'): keyof Console {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warn';
      case 'debug': return 'debug';
      default: return 'log';
    }
  }

}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Also export the class for static methods
export { AuditLogger };

// React hook for using audit logging in components
export function useAuditLogger() {
  return {
    logAuthentication: auditLogger.logAuthentication.bind(auditLogger),
    logFraudDetection: auditLogger.logFraudDetection.bind(auditLogger),
    logDataAccess: auditLogger.logDataAccess.bind(auditLogger),
    logUserManagement: auditLogger.logUserManagement.bind(auditLogger),
    logSecurity: auditLogger.logSecurity.bind(auditLogger),
    logApiAccess: auditLogger.logApiAccess.bind(auditLogger),
    getLogs: auditLogger.getLogs.bind(auditLogger),
    getStatistics: auditLogger.getStatistics.bind(auditLogger),
    exportLogs: auditLogger.exportLogs.bind(auditLogger),
  };
}
