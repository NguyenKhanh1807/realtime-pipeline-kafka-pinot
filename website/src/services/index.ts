/**
 * Services Barrel Export
 */

// Pinot Client
export { PinotClient, pinotClient } from './pinot-client';
export type {
  PinotQueryRequest,
  PinotQueryResponse,
  FraudDetectionResult as PinotFraudDetectionResult,
} from './pinot-client';

// User Management API Client
export { UserManagementApiClient, userManagementApiClient } from './user-management-api-client';
export type {
  ApiUser,
  RegisterRequest,
  RegisterResponse,
  ApiResponse,
} from './user-management-api-client';

// WebSocket Client
export { WebSocketClient, wsClient, useWebSocket } from './websocket-client';
export type {
  TransactionUpdate,
  FraudAlert,
  AnalyticsUpdate,
  WebSocketEventType,
  WebSocketEvent,
} from './websocket-client';

// Audit Logger
export { AuditLogger, auditLogger, useAuditLogger } from './audit-logger';
export type {
  AuditLogEntry,
  AuditCategory,
  AuditAction,
} from './audit-logger';

// Cache Manager
export { CacheManager, cacheManager, useCache, withCache } from './cache-manager';

// API Client Wrapper
export { ApiClientWrapper, createApiClient } from './api-client-wrapper';
export type {
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './api-client-wrapper';

// Polling Manager
export { PollingManager, pollingManager } from './polling-manager';
export type {
  PollingTask,
  PollingManagerOptions,
} from './polling-manager';

