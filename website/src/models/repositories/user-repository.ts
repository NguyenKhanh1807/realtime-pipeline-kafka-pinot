/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */

import type { UserId, Email, Username, PaginatedResult, PaginationParams } from '../types';
import type { User } from '../entities/user';

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
