import { useAppStore } from '@/src/view-models/stores';
import {  LoginFormData, RegisterFormData } from '@/src/view-models';
import { sleep } from '@/src/utils/helpers';
import { log as logger } from '@/src/lib/logger';

/**
 * Authentication commands - orchestrate complex authentication operations
 * Commands handle the coordination between multiple services and state updates
 */

export class AuthCommands {
  private store = useAppStore;

  /**
   * Login command - handles the complete login flow
   * TEMPORARILY DISABLED: Validation and API calls bypassed for testing
   */
  static async login(credentials: LoginFormData) {
    const { setLoading, setError, setUser, setAuthenticated } = useAppStore.getState();

    // TEMPORARILY DISABLED: Skip validation
    // const validationErrors = validateLoginForm(credentials);
    // if (Object.values(validationErrors).some(error => error !== null)) {
    //   const firstError = Object.values(validationErrors).find(error => error !== null);
    //   throw new Error(firstError || 'Validation failed');
    // }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      // Step 3: Add artificial delay for UX
      await sleep(500);

      // TEMPORARILY DISABLED: Skip API call, use mock admin user
      // Step 4: Execute login
      // await login({
      //   username: credentials.username,
      //   password: credentials.password,
      // });

      // Mock admin user for testing
      const mockUser = {
        id: 'admin-test',
        email: credentials.username || 'admin@test.com',
        name: {
          first: 'Admin',
          last: 'User',
        },
        avatar: undefined,
        role: 'admin' as const,
        createdAt: new Date(),
      };

      setUser(mockUser);
      setAuthenticated(true);

      // Step 5: Handle success
      const correlationId = logger.generateCorrelationId();
      logger.info('Login successful (bypassed)', { correlationId, userId: credentials.username });

    } catch (error) {
      // Step 6: Handle error
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      // Step 7: Clean up
      setLoading(false);
    }
  }

  /**
   * Register command - handles the complete registration flow
   * TEMPORARILY DISABLED: Validation and API calls bypassed for testing
   */
  static async register(userData: RegisterFormData) {
    const { setLoading, setError, setUser, setAuthenticated } = useAppStore.getState();

    // TEMPORARILY DISABLED: Skip validation
    // const validationErrors = validateRegisterForm(userData);
    // if (Object.values(validationErrors).some(error => error !== null)) {
    //   const firstError = Object.values(validationErrors).find(error => error !== null);
    //   throw new Error(firstError || 'Validation failed');
    // }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      // Step 3: Add artificial delay for UX
      await sleep(500);

      // TEMPORARILY DISABLED: Skip API call, use mock user
      // Mock successful registration
      const mockUser = {
        id: Date.now().toString(),
        email: userData.email || 'user@test.com',
        name: {
          first: userData.firstName || 'User',
          last: userData.lastName || 'Test',
        },
        avatar: undefined,
        role: 'user' as const,
        createdAt: new Date(),
      };

      setUser(mockUser);
      setAuthenticated(true);

      const correlationId = logger.generateCorrelationId();
      logger.info('Registration successful (bypassed)', { correlationId, userId: userData.email });

    } catch (error) {
      // Step 7: Handle error
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      // Step 8: Clean up
      setLoading(false);
    }
  }

  /**
   * Logout command - handles complete logout flow
   */
  static async logout() {
    const { logout, setError } = useAppStore.getState();

    try {
      // Step 1: Execute logout
      logout();

      // Step 2: Clear any cached data
      localStorage.removeItem('userPreferences');
      localStorage.removeItem('lastVisitedPage');

      // Step 3: Handle success (could include analytics, cleanup, etc.)
      const correlationId = logger.generateCorrelationId();
      const { user } = useAppStore.getState();
      logger.info('Logout successful', { correlationId, userId: user?.email });

    } catch (error) {
      // Step 4: Handle error (log but don't throw - logout should always succeed)
      const errorMessage = error instanceof Error ? error.message : 'Logout error';
      setError(errorMessage);
      const correlationId = logger.generateCorrelationId();
      const { user } = useAppStore.getState();
      logger.error('Logout error', error instanceof Error ? error : new Error(String(error)), { correlationId, userId: user?.email });
    }
  }

  /**
   * Refresh session command - checks if current session is still valid
   */
  static async refreshSession() {
    const { user, setUser, setAuthenticated, setError } = useAppStore.getState();

    if (!user) return;

    try {
      // Step 1: Check session validity (mock for now)
      await sleep(500);

      // Step 2: If session is valid, update user data
      // In real app, this would make an API call to refresh user data
      const updatedUser = {
        ...user,
        lastActive: new Date(),
      };

      setUser(updatedUser);
      setAuthenticated(true);

    } catch (error) {
      // Step 3: If session is invalid, logout
      const correlationId = logger.generateCorrelationId();
      logger.warn('Session refresh failed', { correlationId, userId: user.email, metadata: { error: error instanceof Error ? error.message : String(error) } });
      await this.logout();
    }
  }

  /**
   * Change password command
   */
  static async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    const { setLoading, setError, user } = useAppStore.getState();

    // Step 1: Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      // Step 3: Execute password change (mock for now)
      await sleep(1000);

      const correlationId = logger.generateCorrelationId();
      logger.info('Password changed', { correlationId, userId: user?.email });

      // Step 4: Handle success
      // Could trigger email notification, force re-login, etc.

    } catch (error) {
      // Step 5: Handle error
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      setError(errorMessage);
      throw error;
    } finally {
      // Step 6: Clean up
      setLoading(false);
    }
  }
}
