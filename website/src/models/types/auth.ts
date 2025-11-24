/**
 * Domain Types for Authentication and Authorization
 * Pure domain concepts without UI dependencies
 */

// User roles in the system
export type UserRole = 'admin' | 'user';

// Role definitions
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access',
  },

  user: {
    name: 'user',
    displayName: 'User',
    description: 'Standard user access',
  },
};

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
}

// Helper functions for role management
export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
  const hierarchy = ['user', 'admin'];
  return hierarchy.indexOf(role1) > hierarchy.indexOf(role2);
}

export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return isRoleHigher(managerRole, targetRole);
}
