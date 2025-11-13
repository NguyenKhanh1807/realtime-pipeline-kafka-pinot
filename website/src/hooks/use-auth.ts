import { useAppStore } from '@/src/view-models';
import { useCallback } from 'react';

/**
 * Custom hook for authentication operations
 * This demonstrates the ViewModel layer in MVVM pattern
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  } = useAppStore();

  // Computed values
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const userDisplayName = user?.name || user?.email || 'Anonymous User';

  // Enhanced login with additional validation
  const enhancedLogin = useCallback(async (credentials: { username: string; password: string }) => {
    // Additional client-side validation
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }

    if (credentials.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      await login(credentials);
    } catch (error) {
      // Log for debugging (would typically go to a logging service)
      console.error('Login failed:', error);
      throw error;
    }
  }, [login]);

  // Enhanced logout with cleanup
  const enhancedLogout = useCallback(() => {
    // Additional cleanup logic can be added here
    logout();
  }, [logout]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    isAdmin,
    isModerator,
    userDisplayName,

    // Actions
    login: enhancedLogin,
    logout: enhancedLogout,
    clearError,

    // Utilities
    hasPermission: (requiredRole: 'admin' | 'moderator' | 'user') => {
      if (requiredRole === 'admin') return isAdmin;
      if (requiredRole === 'moderator') return isModerator;
      return isAuthenticated;
    },
  };
};
