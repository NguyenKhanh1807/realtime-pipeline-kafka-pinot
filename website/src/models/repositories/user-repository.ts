/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */

import type { UserId, Email, Username, PaginatedResult, PaginationParams, User } from '@/src/models';

export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: Username): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Find multiple users with pagination
   */
  findMany(params: PaginationParams): Promise<PaginatedResult<User>>;

  /**
   * Search users by query
   */
  search(query: string, params: PaginationParams): Promise<PaginatedResult<User>>;

  /**
   * Create a new user
   */
  create(user: User): Promise<User>;

  /**
   * Create a new user with plain password
   * This is a convenience method for user registration
   */
  createUser(data: {
    username: string;
    password: string;
    role?: 'admin' | 'user';
    component?: string;
  }): Promise<User>;

  /**
   * Create a new admin user with hardcoded temporary password
   * Admin accounts are created with password: TempPassword123!
   * This password should be changed by the admin after first login
   */
  createAdminUser(data: {
    username: string;
    component?: string;
  }): Promise<User>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete a user
   */
  delete(id: UserId): Promise<void>;

  /**
   * Check if username exists
   */
  existsByUsername(username: Username): Promise<boolean>;

  /**
   * Check if email exists
   */
  existsByEmail(email: Email): Promise<boolean>;
}
