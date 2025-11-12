/**
 * Website API Client
 * Handles communication with the website's backend API for authentication and user management
 */

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
   * Get all users
   */
  async getUsers(): Promise<ApiResponse<{ users: Record<string, ApiUser> }>> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
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
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // First, get all users to validate credentials
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

      // For demo purposes, we'll accept any password since the actual passwords are hashed
      // In a real implementation, you'd send credentials to a login endpoint
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
    return {
      id: apiUser.username,
      email: apiUser.username, // Using username as email for demo
      name: {
        first: apiUser.username.split('_')[0] || 'User',
        last: apiUser.component,
      },
      role: apiUser.role.toLowerCase() as 'admin' | 'user' | 'moderator',
      avatar: undefined,
      createdAt: new Date(),
    };
  }
}

// Export singleton instance
export const websiteApiClient = new WebsiteApiClient();
