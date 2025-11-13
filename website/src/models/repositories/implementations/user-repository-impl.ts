/**
 * User Repository Implementation
 * Concrete implementation that wraps WebsiteApiClient
 * Transforms API responses to domain entities
 */

import type { UserRepository } from '../user-repository';
import type { 
  User, 
  UserId, 
  Email, 
  Username, 
  PaginatedResult, 
  PaginationParams 
} from '@/src/models';
import { User as UserEntity } from '@/src/models/entities/user';
import { WebsiteApiClient, type ApiUser } from '@/src/services/website-api';
import { AuthenticationService } from '@/src/models/services/authentication-service';

export class UserRepositoryImpl implements UserRepository {
  constructor(private apiClient: WebsiteApiClient) {}

  /**
   * Authenticate user with credentials
   * Uses API login endpoint which handles password verification server-side
   * The API receives plain password, hashes it, and compares with database
   */
  async authenticate(credentials: { username: string; password: string }): Promise<User> {
    // Use API login endpoint - API handles password hashing and verification server-side
    // We send plain password, API hashes it and checks against database
    const loginResponse = await this.apiClient.login({
      username: credentials.username,
      password: credentials.password, // Plain password - API will hash and verify
    });

    if (!loginResponse.success || !loginResponse.user) {
      throw new Error(loginResponse.message || 'Invalid username or password');
    }

    // Transform API user to domain entity
    // API has already verified the password server-side, so we can trust the response
    const domainUser = UserEntity.fromApiUser(loginResponse.user);

    // Record successful login in domain entity (for domain logic tracking)
    domainUser.recordLogin();

    return domainUser;
  }

  /**
   * Find user by ID
   */
  async findById(id: UserId): Promise<User | null> {
    const response = await this.apiClient.getUser(id);
    
    if (!response.success || !response.data?.user) {
      return null;
    }

    return UserEntity.fromApiUser(response.data.user);
  }

  /**
   * Find user by username
   */
  async findByUsername(username: Username): Promise<User | null> {
    // API doesn't have a direct findByUsername, so we use getUser
    return this.findById(username);
  }

  /**
   * Find user by email
   * Note: API uses username as identifier, so we search by username
   */
  async findByEmail(email: Email): Promise<User | null> {
    // Extract username from email if it's in email format
    // Otherwise, treat email as username
    const username = email.includes('@') ? email.split('@')[0] : email;
    return this.findByUsername(username as Username);
  }

  /**
   * Find multiple users with pagination
   */
  async findMany(params: PaginationParams): Promise<PaginatedResult<User>> {
    const response = await this.apiClient.getUsers({
      status: 'all',
    });

    if (!response.success || !response.data) {
      return {
        items: [],
        total: 0,
        page: params.page,
        limit: params.limit,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    const allUsers = Object.values(response.data.users) as ApiUser[];
    
    // Transform to domain entities
    const domainUsers = allUsers.map(apiUser => UserEntity.fromApiUser(apiUser));

    // Apply pagination
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedUsers = domainUsers.slice(startIndex, endIndex);

    // Apply sorting if specified
    let sortedUsers = paginatedUsers;
    if (params.sortBy) {
      sortedUsers = [...paginatedUsers].sort((a, b) => {
        const aValue = (a as any)[params.sortBy!];
        const bValue = (b as any)[params.sortBy!];
        
        if (aValue === bValue) return 0;
        const comparison = aValue > bValue ? 1 : -1;
        return params.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const totalPages = Math.ceil(domainUsers.length / params.limit);

    return {
      items: sortedUsers,
      total: domainUsers.length,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  /**
   * Search users by query
   */
  async search(query: string, params: PaginationParams): Promise<PaginatedResult<User>> {
    const response = await this.apiClient.getUsers({
      search: query,
      status: 'all',
    });

    if (!response.success || !response.data) {
      return {
        items: [],
        total: 0,
        page: params.page,
        limit: params.limit,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    const allUsers = Object.values(response.data.users) as ApiUser[];
    const domainUsers = allUsers.map(apiUser => UserEntity.fromApiUser(apiUser));

    // Apply pagination
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedUsers = domainUsers.slice(startIndex, endIndex);

    const totalPages = Math.ceil(domainUsers.length / params.limit);

    return {
      items: paginatedUsers,
      total: domainUsers.length,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    // Transform domain user to API format
    // Note: If user has passwordHash, it means it's already hashed
    // For new users, use createUser() method instead which accepts plain password
    // Get passwordHash from user's internal props via toJSON()
    const userProps = user.toJSON();
    const apiUserData = {
      username: user.username,
      password: userProps.passwordHash, // Domain has passwordHash (already hashed)
      component: (user.metadata?.component as string) || 'CONTROLLER',
      role: user.role.toUpperCase(),
      tables: (user.metadata?.tables as string[]) || [],
      permissions: [], // Permissions removed - using role-based access only
    };

    const response = await this.apiClient.createUser(apiUserData);

    if (!response.success || !response.data?.user) {
      throw new Error(response.error || 'Failed to create user');
    }

    return UserEntity.fromApiUser(response.data.user);
  }

  /**
   * Create a new user with plain password (for registration)
   * API will hash the password
   */
  async createUser(data: {
    username: string;
    password: string;
    role?: 'admin' | 'user';
    component?: string;
  }): Promise<User> {
    const apiUserData = {
      username: data.username,
      password: data.password, // Plain password - API will hash it
      component: data.component || 'CONTROLLER',
      role: (data.role || 'user').toUpperCase(),
      tables: [],
      permissions: [],
    };

    const response = await this.apiClient.createUser(apiUserData);

    if (!response.success || !response.data?.user) {
      throw new Error(response.error || 'Failed to create user');
    }

    // API returns user with hashed password, transform to domain entity
    return UserEntity.fromApiUser(response.data.user);
  }

  /**
   * Update an existing user
   */
  async update(user: User): Promise<User> {
    const updates: {
      password?: string;
      component?: string;
      role?: string;
    } = {};

    // Get passwordHash from user's internal props via toJSON()
    const userProps = user.toJSON();
    if (userProps.passwordHash) {
      updates.password = userProps.passwordHash;
    }

    if (user.metadata?.component) {
      updates.component = user.metadata.component as string;
    }

    if (user.role) {
      updates.role = user.role.toUpperCase();
    }

    const response = await this.apiClient.updateUser(user.username, updates);

    if (!response.success || !response.data?.user) {
      throw new Error(response.error || 'Failed to update user');
    }

    return UserEntity.fromApiUser(response.data.user);
  }

  /**
   * Delete a user
   */
  async delete(id: UserId): Promise<void> {
    const response = await this.apiClient.deleteUser(id);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete user');
    }
  }

  /**
   * Check if username exists
   */
  async existsByUsername(username: Username): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * Check if email exists
   */
  async existsByEmail(email: Email): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }
}

