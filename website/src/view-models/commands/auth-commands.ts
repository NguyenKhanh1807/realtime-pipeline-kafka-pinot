import { useAppStore, type User } from '@/src/view-models/stores';
import {  LoginFormData, RegisterFormData } from '@/src/view-models';
import { sleep } from '@/src/utils/helpers';
import { log as logger } from '@/src/lib/logger';
import { userRepository } from '@/src/models/repositories';
import { User as UserEntity } from '@/src/models/entities/user';

/**
 * Authentication commands - orchestrate complex authentication operations
 * Commands handle the coordination between multiple services and state updates
 */

export class AuthCommands {
  private store = useAppStore;

  /**
   * Login command - handles the complete login flow
   */
  static async login(credentials: LoginFormData) {
    const { setLoading, setError, setUser, setAuthenticated } = useAppStore.getState();

    // Basic validation
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }

    try {
      // Step 1: Set loading state
      setLoading(true);
      setError(null);

      // Step 2: Add artificial delay for UX
      await sleep(500);

      // Step 3: Authenticate via Model layer (repository)
      const domainUser = await userRepository.authenticate({
        username: credentials.username.trim(),
        password: credentials.password,
      });

      // Step 4: Transform domain user to ViewModel User format
      const displayData = domainUser.toDisplay();
      const userMetadata = domainUser.metadata || {};
      
      const user: User = {
        username: displayData.username,
        id: displayData.id,
        role: displayData.role,
        component: userMetadata.component as string | undefined,
        email: displayData.email,
      };
      
      setUser(user);
      setAuthenticated(true);

      const correlationId = logger.generateCorrelationId();
      logger.info('Login successful', {
        correlationId,
        userId: domainUser.username,
        operation: 'login',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      
      const correlationId = logger.generateCorrelationId();
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'login',
        metadata: { error: errorMessage },
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Register command - handles the complete registration flow
   */
  static async register(userData: RegisterFormData) {
    const { setLoading, setError, setUser, setAuthenticated } = useAppStore.getState();

    // Basic validation
    if (!userData.username || !userData.password || !userData.confirmPassword) {
      throw new Error('Username, password, and confirm password are required');
    }

    if (userData.password !== userData.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      const correlationId = logger.generateCorrelationId();
      logger.info('Starting registration', { correlationId, metadata: { username: userData.username } });

      // Step 3: Create user via Model layer (repository)
      // Note: Repository will handle password hashing and API communication
      // We pass the plain password - repository will send it to API which hashes it
      const createdUser = await userRepository.createUser({
        username: userData.username.trim(),
        password: userData.password,
        role: 'user',
        component: 'CONTROLLER',
      });

      // Step 4: Transform domain user to ViewModel User format
      const displayData = createdUser.toDisplay();
      const userMetadata = createdUser.metadata || {};

      const user: User = {
        username: displayData.username,
        id: displayData.id,
        role: displayData.role,
        component: userMetadata.component as string | undefined,
        email: displayData.email,
      };

      setUser(user);
      setAuthenticated(true);

      logger.info('Registration successful', {
        correlationId,
        userId: createdUser.username,
        operation: 'register',
      });

    } catch (error) {
      // Step 7: Handle error
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      
      const correlationId = logger.generateCorrelationId();
      logger.error('Registration failed', error instanceof Error ? error : new Error(errorMessage), {
        correlationId,
        metadata: { username: userData.username },
        operation: 'register',
      });
      
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
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');

      // Step 3: Handle success (could include analytics, cleanup, etc.)
      const correlationId = logger.generateCorrelationId();
      const { user } = useAppStore.getState();
      logger.info('Logout successful', { correlationId, userId: user?.username || user?.id });

    } catch (error) {
      // Step 4: Handle error (log but don't throw - logout should always succeed)
      const errorMessage = error instanceof Error ? error.message : 'Logout error';
      setError(errorMessage);
      const correlationId = logger.generateCorrelationId();
      const { user } = useAppStore.getState();
      logger.error('Logout error', error instanceof Error ? error : new Error(String(error)), { correlationId, userId: user?.username || user?.id });
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
      // Keep the user as is since we don't have lastActive in the User type
      setUser(user);
      setAuthenticated(true);

    } catch (error) {
      // Step 3: If session is invalid, logout
      const correlationId = logger.generateCorrelationId();
      logger.warn('Session refresh failed', { correlationId, userId: user.username || user.id, metadata: { error: error instanceof Error ? error.message : String(error) } });
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
      logger.info('Password changed', { correlationId, userId: user?.username || user?.id });

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
