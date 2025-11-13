/**
 * Website API Client
 * Handles communication with the website's backend API for authentication and user management
 */

import bcrypt from 'bcryptjs';

const WEBSITE_API_BASE_URL = 'http://93.115.172.151:9000';

export interface ApiUser {
  username: string;
  password: string;
  component: string;
  role: string;
  tables: string[];
  permissions: string[];
  usernameWithComponent: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: ApiUser;
  token?: string;
  message?: string;
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

export class WebsiteApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = WEBSITE_API_BASE_URL) {
    this.baseUrl = baseUrl;
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
   * Authenticate user
   * Sends plain password to API - API should hash it and verify against database server-side
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Call API login endpoint - API handles password hashing and verification server-side
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password, // Plain password - API will hash and verify
        }),
      });

      if (!response.ok) {
        // If API endpoint doesn't exist, fall back to client-side verification
        // This is a temporary fallback until proper API endpoint is available
        return this.fallbackLogin(credentials);
      }

      const data = await response.json();

      if (data.success && data.user) {
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: data.message || 'Login successful',
        };
      }

      return {
        success: false,
        message: data.message || 'Invalid username or password',
      };

    } catch (error) {
      // If API endpoint fails, fall back to client-side verification
      // This is a temporary fallback until proper API endpoint is available
      console.warn('API login endpoint failed, using fallback:', error);
      return this.fallbackLogin(credentials);
    }
  }

  /**
   * Fallback login method - does client-side password verification
   * This should be removed once proper server-side login endpoint is available
   */
  private async fallbackLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Get all users to validate credentials (fallback method)
      const usersResponse = await this.getUsers();

      if (!usersResponse.success || !usersResponse.data) {
        return {
          success: false,
          message: 'Failed to authenticate - could not retrieve user data',
        };
      }

      // Find user by username
      const user = Object.values(usersResponse.data.users).find(
        (u: ApiUser) => u.username === credentials.username
      );

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Validate password is provided
      if (!credentials.password || credentials.password.trim() === '') {
        return {
          success: false,
          message: 'Password is required',
        };
      }

      // Verify password against stored bcrypt hash (client-side fallback)
      // NOTE: This should be done server-side in production
      try {
        const passwordMatch = bcrypt.compareSync(credentials.password, user.password);

        if (!passwordMatch) {
          return {
            success: false,
            message: 'Invalid username or password',
          };
        }
      } catch (error) {
        console.error('Password verification failed:', error);
        return {
          success: false,
          message: 'Authentication error - please try again',
        };
      }

      // Password verified successfully
      return {
        success: true,
        user,
        token: `mock-token-${Date.now()}`,
        message: 'Login successful',
      };

    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
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
          role: userData.role || 'USER',
          tables: userData.tables || [],
          permissions: userData.permissions || [],
        }),
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
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
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
   */
  async deleteUser(username: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}?component=CONTROLLER`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

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
export const websiteApiClient = new WebsiteApiClient();
