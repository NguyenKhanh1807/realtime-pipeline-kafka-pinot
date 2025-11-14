/**
 * User Repository Implementation
 * Concrete implementation that wraps UserManagementApiClient
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
import { UserManagementApiClient, type ApiUser } from '@/src/services/user-management-api-client';
import { AuthenticationService } from '@/src/models/services/authentication-service';

export class UserRepositoryImpl implements UserRepository {
  constructor(private apiClient: UserManagementApiClient) {}
  /**
   * Find user by ID
   * Returns null if user doesn't exist (handles 404/400 gracefully)
   */
  async findById(id: UserId): Promise<User | null> {
    try {
      const response = await this.apiClient.getUser(id);

      // User not found (404/400) or API error - return null gracefully
      if (!response.success || !response.data?.user) {
        return null;
      }

      return UserEntity.fromApiUser(response.data.user);
    } catch (error) {
      // Catch any unexpected errors and return null
      console.warn(`User not found or error fetching user ${id}:`, error);
      return null;
    }
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

    if (!response.success) {
      // Check if error is due to user already existing
      const errorMessage = response.error || 'Failed to create user';
      
      // Check for conflict errors (user already exists)
      const lowerErrorMessage = errorMessage.toLowerCase();
      if (lowerErrorMessage.includes('already exists') || 
          lowerErrorMessage.includes('duplicate') ||
          lowerErrorMessage.includes('conflict') ||
          lowerErrorMessage.includes('409')) {
        const { ConflictError } = await import('@/src/models/errors/domain-errors');
        throw new ConflictError('User', `Username "${data.username}" already exists`);
      }
      
      // Check for validation errors (400 Bad Request)
      if (lowerErrorMessage.includes('400') || 
          lowerErrorMessage.includes('bad request') ||
          lowerErrorMessage.includes('validation') ||
          lowerErrorMessage.includes('invalid')) {
        const { ValidationError } = await import('@/src/models/errors/domain-errors');
        // Try to extract field name from error message
        const fieldMatch = errorMessage.match(/(username|password|component|role)/i);
        const field = fieldMatch ? fieldMatch[1].toLowerCase() : 'user';
        throw new ValidationError(field, errorMessage);
      }
      
      // For other errors, throw generic error with the API message
      throw new Error(errorMessage);
    }

    // Handle different API response formats:
    // 1. API returns { user: ApiUser } - wrapped format
    // 2. API returns ApiUser directly - direct format
    // 3. API returns success but no user data - fetch user after creation
    let apiUser: any;
    if (response.data?.user) {
      // Wrapped format: { user: { username: "...", ... } }
      apiUser = response.data.user;
    } else if (response.data && typeof response.data === 'object' && 'username' in response.data) {
      // Direct format: { username: "...", password: "...", ... }
      apiUser = response.data;
    } else {
      // API returned success but no user data - construct user from input data
      // This handles cases where the API doesn't return the user object in the response
      // Since the API returned success, we know the user was created, so we can construct
      // the user object from the data we sent
      console.log('API returned success but no user data, constructing user from input data...', {
        responseData: response.data,
        username: data.username,
      });
      
      // Construct user object from input data
      // The API has created the user successfully, so we can trust the input data
      apiUser = {
        username: data.username,
        password: '', // Password not returned for security (already hashed on server)
        component: data.component || 'CONTROLLER',
        role: (data.role || 'user').toUpperCase(),
        tables: [],
        permissions: [],
        usernameWithComponent: `${data.username}_${data.component || 'CONTROLLER'}`,
      };
    }

    // API returns user with hashed password, transform to domain entity
    return UserEntity.fromApiUser(apiUser);
  }

  /**
   * Create a new admin user with hardcoded temporary password
   * Admin accounts are created with password: TempPassword123!
   * This password should be changed by the admin after first login
   */
  async createAdminUser(data: {
    username: string;
    component?: string;
  }): Promise<User> {
    const response = await this.apiClient.createAdminUser({
      username: data.username,
      component: data.component || 'CONTROLLER',
    });

    if (!response.success) {
      // Check if error is due to user already existing
      const errorMessage = response.error || 'Failed to create admin user';
      
      // Check for conflict errors (user already exists)
      const lowerErrorMessage = errorMessage.toLowerCase();
      if (lowerErrorMessage.includes('already exists') || 
          lowerErrorMessage.includes('duplicate') ||
          lowerErrorMessage.includes('conflict') ||
          lowerErrorMessage.includes('409')) {
        const { ConflictError } = await import('@/src/models/errors/domain-errors');
        throw new ConflictError('User', `Username "${data.username}" already exists`);
      }
      
      // Check for validation errors (400 Bad Request)
      if (lowerErrorMessage.includes('400') || 
          lowerErrorMessage.includes('bad request') ||
          lowerErrorMessage.includes('validation') ||
          lowerErrorMessage.includes('invalid')) {
        const { ValidationError } = await import('@/src/models/errors/domain-errors');
        // Try to extract field name from error message
        const fieldMatch = errorMessage.match(/(username|password|component|role)/i);
        const field = fieldMatch ? fieldMatch[1].toLowerCase() : 'user';
        throw new ValidationError(field, errorMessage);
      }
      
      // For other errors, throw generic error with the API message
      throw new Error(errorMessage);
    }

    // Handle different API response formats:
    // 1. API returns { user: ApiUser } - wrapped format
    // 2. API returns ApiUser directly - direct format
    // 3. API returns success but no user data - fetch user after creation
    let apiUser: any;
    if (response.data?.user) {
      // Wrapped format: { user: { username: "...", ... } }
      apiUser = response.data.user;
    } else if (response.data && typeof response.data === 'object' && 'username' in response.data) {
      // Direct format: { username: "...", password: "...", ... }
      apiUser = response.data;
    } else {
      // API returned success but no user data - construct user from input data
      // This handles cases where the API doesn't return the user object in the response
      // Since the API returned success, we know the admin user was created, so we can construct
      // the user object from the data we sent
      console.log('API returned success but no user data, constructing admin user from input data...', {
        responseData: response.data,
        username: data.username,
      });
      
      // Construct admin user object from input data
      // The API has created the user successfully, so we can trust the input data
      apiUser = {
        username: data.username,
        password: '', // Password not returned for security (already hashed on server)
        component: data.component || 'CONTROLLER',
        role: 'ADMIN',
        tables: [],
        permissions: [],
        usernameWithComponent: `${data.username}_${data.component || 'CONTROLLER'}`,
      };
    }

    // API returns user with hashed password, transform to domain entity
    return UserEntity.fromApiUser(apiUser);
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
   * Handles 404/400 gracefully - throws NotFoundError if user doesn't exist
   */
  async delete(id: UserId): Promise<void> {
    const response = await this.apiClient.deleteUser(id);

    if (!response.success) {
      // If user not found, throw NotFoundError for proper error handling
      if (response.error?.toLowerCase().includes('not found')) {
        const { NotFoundError } = await import('@/src/models/errors/domain-errors');
        throw new NotFoundError('User', id);
      }
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

