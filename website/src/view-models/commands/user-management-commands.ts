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
  password: string;
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

      if (!userData.password || userData.password.length < 8) {
        throw new ValidationError('password', 'Password must be at least 8 characters');
      }

      // Check if user already exists
      const exists = await userRepository.existsByUsername(userData.username.trim());
      if (exists) {
        throw new ConflictError('User', `Username "${userData.username}" already exists`);
      }

      // Create user through repository
      const domainUser = await userRepository.createUser({
        username: userData.username.trim(),
        password: userData.password,
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
      logger.error('Failed to create user', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'createUser',
        metadata: { username: userData.username },
      });
      throw error;
    }
  }

  /**
   * Update user password
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

      // Get user to verify old password
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Verify old password using authentication service
      const { AuthenticationService } = await import('@/src/models/services/authentication-service');
      const authService = new AuthenticationService();
      
      const isValidPassword = await authService.verifyPassword(updateData.oldPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new ValidationError('oldPassword', 'Current password is incorrect');
      }

      // Hash new password and update
      const newPasswordHash = await authService.hashPassword(updateData.newPassword);
      user.changePassword(newPasswordHash);

      // Update through repository
      await userRepository.update(user);

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
   */
  static async deleteUser(username: string): Promise<void> {
    try {
      // Check if user exists
      const user = await userRepository.findByUsername(username);
      if (!user) {
        throw new NotFoundError('User', username);
      }

      // Delete through repository
      await userRepository.delete(username);

      const correlationId = logger.generateCorrelationId();
      logger.info('User deleted successfully', {
        correlationId,
        operation: 'deleteUser',
        metadata: { username },
      });

    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      logger.error('Failed to delete user', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'deleteUser',
        metadata: { username },
      });
      throw error;
    }
  }
}

