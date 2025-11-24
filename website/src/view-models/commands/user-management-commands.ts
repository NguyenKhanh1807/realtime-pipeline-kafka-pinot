/**
 * User Management Commands
 * ViewModel commands for user management operations
 * Uses Model layer (repositories) for data access
 */

import { userRepository } from '@/src/models/repositories';
import { useAppStore } from '@/src/view-models/stores/app-store';
import { log as logger } from '@/src/lib/logger';
import type { User as UserType } from '@/src/types';
import { NotFoundError, ConflictError, ValidationError } from '@/src/models/errors';

export interface UserFilters {
  role?: 'all' | 'admin' | 'user';
  search?: string;
}

export interface CreateUserData {
  username: string;
  password?: string; // Optional - admin users get hardcoded password
  role?: 'admin' | 'user';
  component?: string;
}

export interface UpdateUserData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * User Management Commands
 * Handles all user management operations through Model layer
 */
export class UserManagementCommands {
  /**
   * Load users with optional filters
   */
  static async loadUsers(filters?: UserFilters): Promise<UserType[]> {
    try {
      // Use repository to fetch users with pagination
      // Get all users first, then filter client-side
      const result = await userRepository.findMany({
        page: 1,
        limit: 1000, // Get all users, pagination handled client-side
      });

      // Apply client-side filtering
      let filteredUsers = result.items;
      
      if (filters?.search) {
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
      
      if (filters?.role && filters.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }

      // Transform domain users to ViewModel format
      return filteredUsers.map(user => ({
        id: user.id,
        username: user.username,
        component: (user.metadata?.component as string) || 'CONTROLLER',
        role: user.role,
        tables: (user.metadata?.tables as string[]) || [],
        permissions: [], // Permissions removed - role-based access only
        usernameWithComponent: `${user.username}_${(user.metadata?.component as string) || 'CONTROLLER'}`,
      }));

    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      logger.error('Failed to load users', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'loadUsers',
        metadata: { filters },
      });
      throw error;
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<UserType> {
    try {
      // Validate input
      if (!userData.username || userData.username.trim() === '') {
        throw new ValidationError('username', 'Username is required');
      }

      // For admin users, password is hardcoded - skip password validation
      // Check role case-insensitively to handle 'admin', 'ADMIN', 'Admin', etc.
      const isAdmin = userData.role?.toLowerCase() === 'admin';
      
      // Only validate password for non-admin users
      if (!isAdmin) {
        if (!userData.password || userData.password.length < 8) {
          throw new ValidationError('password', 'Password must be at least 8 characters');
        }
      }

      // Skip existence check - let the API handle it via POST
      // The API will return an error if the user already exists
      // This avoids GET requests that return 400 errors

      // Create user through repository
      // Use separate method for admin users (password is hardcoded)
      const domainUser = isAdmin
        ? await userRepository.createAdminUser({
            username: userData.username.trim(),
            component: userData.component || 'CONTROLLER',
          })
        : await userRepository.createUser({
            username: userData.username.trim(),
            password: userData.password!,
            role: userData.role || 'user',
            component: userData.component || 'CONTROLLER',
          });

      // Transform to ViewModel format
      const viewModelUser: UserType = {
        id: domainUser.id,
        username: domainUser.username,
        component: (domainUser.metadata?.component as string) || 'CONTROLLER',
        role: domainUser.role,
        tables: (domainUser.metadata?.tables as string[]) || [],
        permissions: [],
        usernameWithComponent: `${domainUser.username}_${(domainUser.metadata?.component as string) || 'CONTROLLER'}`,
      };

      const correlationId = logger.generateCorrelationId();
      logger.info('User created successfully', {
        correlationId,
        operation: 'createUser',
        metadata: { username: userData.username },
      });

      return viewModelUser;

    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Failed to create user', error instanceof Error ? error : new Error(errorMessage), {
        correlationId,
        operation: 'createUser',
        metadata: { 
          username: userData.username,
          role: userData.role,
          errorMessage,
        },
      });
      
      // Re-throw the error to let the UI handle it
      throw error;
    }
  }

  /**
   * Update user password
   * userId should be the username (since user.id === user.username in this system)
   * Skips existence check - let the API handle validation via PUT
   */
  static async updateUserPassword(userId: string, updateData: UpdateUserData): Promise<void> {
    try {
      // Validate input
      if (!updateData.oldPassword || !updateData.newPassword || !updateData.confirmPassword) {
        throw new ValidationError('password', 'All password fields are required');
      }

      if (updateData.newPassword !== updateData.confirmPassword) {
        throw new ValidationError('confirmPassword', 'New passwords do not match');
      }

      if (updateData.newPassword.length < 8) {
        throw new ValidationError('password', 'New password must be at least 8 characters');
      }

      // Skip user lookup - let the API handle validation via PUT
      // Hash new password and call API directly
      // The API will verify the old password and handle user existence validation
      const { AuthenticationService } = await import('@/src/models/services/authentication-service');
      const { userManagementApiClient } = await import('@/src/services');
      
      const newPasswordHash = AuthenticationService.hashPassword(updateData.newPassword);
      
      // Call update API directly via PUT - API handles old password verification and user existence
      const response = await userManagementApiClient.updateUser(userId, {
        password: newPasswordHash,
        passwordChanged: true,
      });

      if (!response.success) {
        // If API returns error about old password, convert to ValidationError
        if (response.error?.toLowerCase().includes('password') || 
            response.error?.toLowerCase().includes('incorrect') ||
            response.error?.toLowerCase().includes('invalid')) {
          throw new ValidationError('oldPassword', response.error || 'Current password is incorrect');
        }
        // If API returns error about user not found, convert to NotFoundError
        if (response.error?.toLowerCase().includes('not found') || 
            response.error?.toLowerCase().includes('does not exist')) {
          throw new NotFoundError('User', userId);
        }
        throw new Error(response.error || 'Failed to update user password');
      }

      const correlationId = logger.generateCorrelationId();
      logger.info('User password updated successfully', {
        correlationId,
        operation: 'updateUserPassword',
        metadata: { userId },
      });

    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      logger.error('Failed to update user password', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'updateUserPassword',
        metadata: { userId },
      });
      throw error;
    }
  }

  /**
   * Delete a user
   * Attempts deletion directly - API handles validation and returns appropriate errors
   */
  static async deleteUser(username: string): Promise<void> {
    try {
      // Attempt to delete - API will return appropriate error if user doesn't exist
      // Repository will convert "not found" errors to NotFoundError
      await userRepository.delete(username);

      const correlationId = logger.generateCorrelationId();
      logger.info('User deleted successfully', {
        correlationId,
        operation: 'deleteUser',
        metadata: { username },
      });

    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      
      // Re-throw NotFoundError as-is (user-friendly)
      if (error instanceof NotFoundError) {
        logger.warn('User not found for deletion', {
          correlationId,
          operation: 'deleteUser',
          metadata: { username },
        });
        throw error;
      }
      
      // Log and re-throw other errors
      logger.error('Failed to delete user', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'deleteUser',
        metadata: { username },
      });
      throw error;
    }
  }
}

