import { useAppStore } from '@/src/viewmodels/stores';
import { validateLoginForm, validateRegisterForm, type LoginFormData, type RegisterFormData } from '@/src/viewmodels/validators/auth-validators';
import { sleep } from '@/src/utils/helpers';

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
    const { setLoading, setError, login } = useAppStore.getState();

    // Step 1: Validate input
    const validationErrors = validateLoginForm(credentials);
    if (Object.values(validationErrors).some(error => error !== null)) {
      const firstError = Object.values(validationErrors).find(error => error !== null);
      throw new Error(firstError || 'Validation failed');
    }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      // Step 3: Add artificial delay for UX (remove in production)
      await sleep(1000);

      // Step 4: Execute login
      await login({
        email: credentials.email,
        password: credentials.password,
      });

      // Step 5: Handle success (could include analytics, redirects, etc.)
      console.log('Login successful');

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
   */
  static async register(userData: RegisterFormData) {
    const { setLoading, setError } = useAppStore.getState();

    // Step 1: Validate input
    const validationErrors = validateRegisterForm(userData);
    if (Object.values(validationErrors).some(error => error !== null)) {
      const firstError = Object.values(validationErrors).find(error => error !== null);
      throw new Error(firstError || 'Validation failed');
    }

    try {
      // Step 2: Set loading state
      setLoading(true);
      setError(null);

      // Step 3: Prepare registration data
      const registrationPayload = {
        email: userData.email,
        password: userData.password,
        name: {
          first: userData.firstName,
          last: userData.lastName,
        },
        preferences: {
          newsletter: false,
          notifications: true,
        },
      };

      // Step 4: Add artificial delay for UX (remove in production)
      await sleep(1500);

      // Step 5: Execute registration (mock for now)
      console.log('Registration payload:', registrationPayload);

      // Mock successful registration
      await sleep(500);

      // Step 6: Auto-login after registration
      await this.login({
        email: userData.email,
        password: userData.password,
      });

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
      console.log('Logout successful');

    } catch (error) {
      // Step 4: Handle error (log but don't throw - logout should always succeed)
      const errorMessage = error instanceof Error ? error.message : 'Logout error';
      setError(errorMessage);
      console.error('Logout error:', error);
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
      console.warn('Session refresh failed:', error);
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

      console.log('Password changed for user:', user?.email);

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
