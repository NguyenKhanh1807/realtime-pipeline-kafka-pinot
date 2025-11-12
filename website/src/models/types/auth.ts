/**
 * Domain Types for Authentication and Authorization
 * Pure domain concepts without UI dependencies
 */

// User roles in the system
export type UserRole = 'admin' | 'analyst' | 'viewer' | 'api_user';

// Permission definitions - granular access control
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

// Role definitions with their permissions
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

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
}

// Helper functions for permission checking
export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every(permission => userPermissions.includes(permission));
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
