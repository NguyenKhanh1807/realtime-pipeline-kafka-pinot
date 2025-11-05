/**
 * Authentication and Authorization Types
 * Defines user roles, permissions, and security policies
 */

export type UserRole = 'admin' | 'analyst' | 'viewer' | 'api_user';

export type Permission =
  // Dashboard permissions
  | 'dashboard:view'
  | 'dashboard:export'

  // Fraud detection permissions
  | 'fraud:view'
  | 'fraud:analyze'
  | 'fraud:override'

  // Transaction permissions
  | 'transactions:view'
  | 'transactions:search'
  | 'transactions:export'

  // User management permissions
  | 'users:view'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'

  // Audit permissions
  | 'audit:view'
  | 'audit:export'
  | 'audit:delete'

  // System permissions
  | 'system:config'
  | 'system:maintenance'
  | 'system:logs'

  // API permissions
  | 'api:read'
  | 'api:write'
  | 'api:admin';

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: UserRole[];
}

export interface User {
  id: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
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

// Role definitions with permissions
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      // All permissions
      'dashboard:view', 'dashboard:export',
      'fraud:view', 'fraud:analyze', 'fraud:override',
      'transactions:view', 'transactions:search', 'transactions:export',
      'users:view', 'users:create', 'users:update', 'users:delete', 'users:manage_roles',
      'audit:view', 'audit:export', 'audit:delete',
      'system:config', 'system:maintenance', 'system:logs',
      'api:read', 'api:write', 'api:admin',
    ],
  },

  analyst: {
    name: 'analyst',
    displayName: 'Fraud Analyst',
    description: 'Can analyze fraud patterns and manage transactions',
    permissions: [
      'dashboard:view', 'dashboard:export',
      'fraud:view', 'fraud:analyze',
      'transactions:view', 'transactions:search', 'transactions:export',
      'audit:view', 'audit:export',
      'api:read',
    ],
  },

  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    permissions: [
      'dashboard:view',
      'fraud:view',
      'transactions:view',
      'audit:view',
    ],
  },

  api_user: {
    name: 'api_user',
    displayName: 'API User',
    description: 'Programmatic access via API only',
    permissions: [
      'api:read', 'api:write',
      'fraud:analyze',
      'transactions:search',
    ],
  },
};

// Permission groups for UI organization
export const PERMISSION_GROUPS = {
  dashboard: ['dashboard:view', 'dashboard:export'],
  fraud: ['fraud:view', 'fraud:analyze', 'fraud:override'],
  transactions: ['transactions:view', 'transactions:search', 'transactions:export'],
  users: ['users:view', 'users:create', 'users:update', 'users:delete', 'users:manage_roles'],
  audit: ['audit:view', 'audit:export', 'audit:delete'],
  system: ['system:config', 'system:maintenance', 'system:logs'],
  api: ['api:read', 'api:write', 'api:admin'],
};

// Helper functions
export function hasPermission(user: User, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_DEFINITIONS[role]?.permissions || [];
}

export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
  const hierarchy = ['viewer', 'api_user', 'analyst', 'admin'];
  return hierarchy.indexOf(role1) > hierarchy.indexOf(role2);
}

export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return isRoleHigher(managerRole, targetRole);
}
