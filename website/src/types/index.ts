/**
 * Types Barrel Export
 * Central export point for all type definitions
 */

// Authentication and Authorization Types
export type {
  UserRole,
  Permission,
  RoleDefinition,
  User,
  Session,
  SecurityPolicy,
  SecurityRule,
  AuditEvent,
} from './auth';

// Authentication and Authorization Constants
export {
  ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
} from './auth';

// Authentication and Authorization Helper Functions
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  isRoleHigher,
  canManageRole,
} from './auth';

