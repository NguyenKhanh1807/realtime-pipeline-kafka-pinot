/**
 * User Management API Client
 * Handles communication with the backend API for authentication and user management operations
 */

import { apiConfig } from '@/src/config/api.config';

const USER_MANAGEMENT_API_BASE_URL = apiConfig.userManagement.baseUrl;

export interface ApiUser {
  username: string;
  password: string;
  component: string;
  role: string;
  tables: string[];
  permissions: string[];
  usernameWithComponent: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  role?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: ApiUser;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class UserManagementApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = USER_MANAGEMENT_API_BASE_URL, timeout: number = apiConfig.userManagement.timeout) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Get all users with optional filters
   */
  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<ApiResponse<{ users: Record<string, ApiUser> }>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      if (params?.role && params.role !== 'all') {
        queryParams.append('role', params.role);
      }
      if (params?.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/users${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      };
    }
  }

  /**
   * Register new user (mock implementation)
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Mock registration - in real app this would call a registration endpoint
      const mockUser: ApiUser = {
        username: userData.username,
        password: '$2a$10$mockHashedPassword', // Mock hashed password
        component: 'CONTROLLER',
        role: userData.role || 'USER',
        tables: [],
        permissions: [],
        usernameWithComponent: `${userData.username}_CONTROLLER`,
      };

      return {
        success: true,
        user: mockUser,
        message: 'Registration successful',
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Logout (mock implementation)
   */
  async logout(): Promise<ApiResponse<null>> {
    try {
      // Mock logout - in real app this would invalidate the session/token
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Get a single user by username
   * Returns success: false for 404/400 (user not found) without throwing
   * This allows graceful existence checks
   */
  async getUser(username: string): Promise<ApiResponse<{ user: ApiUser }>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Handle 404/400 as "user not found" - return gracefully without throwing
      if (response.status === 404 || response.status === 400) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      };
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    username: string;
    password: string;
    component?: string;
    passwordChanged?: boolean;
    role?: string;
    tables?: string[];
    permissions?: string[];
  }): Promise<ApiResponse<{ user: ApiUser }>> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          password: userData.password,
          component: userData.component || 'CONTROLLER',
          componentType: userData.component || 'CONTROLLER', // API expects componentType enum
          role: userData.role || 'USER',
          tables: userData.tables || [],
          permissions: userData.permissions || [],
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            // Try to parse as JSON first
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorJson.details || errorMessage;
            } catch {
              // If not JSON, use the text as-is
              errorMessage = `${errorMessage} - ${errorText}`;
            }
          }
        } catch (parseError) {
          // If we can't read the error text, use the status
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create a new admin user with hardcoded temporary password
   * Admin accounts are created with password: TempPassword123!
   * This password should be changed by the admin after first login
   */
  async createAdminUser(userData: {
    username: string;
    component?: string;
    tables?: string[];
    permissions?: string[];
  }): Promise<ApiResponse<{ user: ApiUser }>> {
    const ADMIN_TEMP_PASSWORD = 'TempPassword123!';
    
    return this.createUser({
      username: userData.username,
      password: ADMIN_TEMP_PASSWORD,
      component: userData.component || 'CONTROLLER',
      role: 'ADMIN',
      tables: userData.tables || [],
      permissions: userData.permissions || [],
    });
  }

  /**
   * Update an existing user
   * URL format: PUT /users/{username}?component=CONTROLLER&passwordChanged=true
   */
  async updateUser(username: string, updates: {
    password?: string;
    component?: string;
    passwordChanged?: boolean;
    role?: string;
  }): Promise<ApiResponse<{ user: ApiUser }>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('component', updates.component || 'CONTROLLER');
      if (updates.passwordChanged !== undefined) {
        queryParams.append('passwordChanged', String(updates.passwordChanged));
      }

      // Build URL with query parameters
      const url = `${this.baseUrl}/users/${encodeURIComponent(username)}?${queryParams.toString()}`;

      // API expects a JSON object (UserConfig) with required fields
      // The object must contain username, component, role, and password (if updating)
      const body: Record<string, unknown> = {
        username: username,
        component: updates.component || 'CONTROLLER', // Required by API
        role: updates.role || 'USER', // Required by API, default to USER
      };
      
      if (updates.password) {
        body.password = updates.password;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body), // Send as JSON object: {"username": "user1", "password": "duc@2001"}
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      };
    }
  }

  /**
   * Delete a user
   * Requires username and component (hardcoded to CONTROLLER)
   * Format: DELETE /users/{username}?component=CONTROLLER
   * Handles 404/400 gracefully (user not found) - returns success: false instead of throwing
   */
  async deleteUser(username: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}?component=CONTROLLER`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Handle 404/400 as "user not found" - return gracefully without throwing
      if (response.status === 404 || response.status === 400) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      
      return {
        success: false,
        error: errorMessage.includes('Failed to fetch') 
          ? 'Network error: Unable to reach the server. Please check your connection and CORS settings.'
          : errorMessage,
      };
    }
  }

  /**
   * Check if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  /**
   * Transform API user to app user format
   */
  transformApiUser(apiUser: ApiUser) {
    // Normalize role: API returns uppercase (ADMIN, USER), convert to lowercase
    const normalizedRole = apiUser.role.toLowerCase();
    const role = (normalizedRole === 'admin' ? 'admin' : 'user') as 'admin' | 'user';
    
    return {
      id: apiUser.username,
      email: apiUser.username, // Using username as email for demo
      name: {
        first: apiUser.username.split('_')[0] || 'User',
        last: apiUser.component,
      },
      role,
      avatar: undefined,
      createdAt: new Date(),
    };
  }
}

// Export singleton instance
export const userManagementApiClient = new UserManagementApiClient();

