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

// Website API Client
export { WebsiteApiClient, websiteApiClient } from './website-api';
export type {
  ApiUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ApiResponse,
} from './website-api';

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

