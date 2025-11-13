/**
 * Authentication and Authorization Types
 * Application/DTO types for API contracts and UI
 * Domain types are imported from models/types/auth.ts
 */

import type { RoleDefinition, UserRole } from '@/src/models/types/auth';

// Re-export domain types
export type {
  UserRole,
  RoleDefinition,
} from '@/src/models/types/auth';

export {
  ROLE_DEFINITIONS,
  isRoleHigher,
  canManageRole,
} from '@/src/models/types/auth';

// Extended RoleDefinition for application layer (adds inheritsFrom)
export interface ExtendedRoleDefinition extends RoleDefinition {
  inheritsFrom?: UserRole[];
}

export interface User {
  // Primary identifier - username from API
  username: string;
  // Keep id for backward compatibility (maps to username)
  id: string;

  // API fields
  component: string;
  role: UserRole;
  tables?: string[];
  permissions?: string[]; // API may return this, but we don't use it (role-based access only)
  usernameWithComponent?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  type: 'password' | 'session' | 'api_rate_limit' | 'ip_restriction' | 'mfa_required';
  conditions: Record<string, any>;
  actions: string[];
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

// Note: Permission system removed - using role-based access control only
// Check user.role instead of user.permissions
