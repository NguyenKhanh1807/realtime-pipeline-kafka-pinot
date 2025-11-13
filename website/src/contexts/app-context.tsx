'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore, User } from '@/src/view-models';

interface AppContextValue {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // App state
  sidebarOpen: boolean;
  currentPage: string;

  // Actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  clearError: () => void;

  // Computed values
  isAdmin: boolean;
  isModerator: boolean;
  userDisplayName: string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    sidebarOpen,
    currentPage,
    isInitialized,
    login,
    logout,
    setSidebarOpen,
    setCurrentPage,
    clearError,
    initializeApp,
  } = useAppStore();

  // Track if we're on the client to prevent hydration mismatches
  const [isClient, setIsClient] = React.useState(false);

  // Mark as client-side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Complete initialization on mount (client-side only)
  // State is already initialized synchronously, this just marks it as complete
  useEffect(() => {
    if (isClient && !isInitialized) {
      initializeApp();
    }
  }, [isClient, initializeApp, isInitialized]);

  // Computed values
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const userDisplayName = user?.username || user?.email || 'Guest';

  // Persist user data when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        localStorage.removeItem('user');
        localStorage.setItem('isAuthenticated', 'false');
      }
    }
  }, [user]);

  const value: AppContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    sidebarOpen,
    currentPage,
    login,
    logout,
    setSidebarOpen,
    setCurrentPage,
    clearError,
    isAdmin,
    isModerator,
    userDisplayName,
  };

  // Don't render children until initialization is complete (client-side only)
  // This prevents flash of unauthenticated content
  // Only show loading screen on client after mount to prevent hydration mismatch
  if (isClient && !isInitialized) {
    return (
      <AppContext.Provider value={value}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Convenience hooks for common app operations
export const useUser = () => useApp().user;
export const useIsAuthenticated = () => useApp().isAuthenticated;
export const useIsLoading = () => useApp().isLoading;
export const useError = () => useApp().error;
export const useSidebarOpen = () => useApp().sidebarOpen;
export const useCurrentPage = () => useApp().currentPage;
export const useUserDisplayName = () => useApp().userDisplayName;
export const useIsAdmin = () => useApp().isAdmin;
export const useIsModerator = () => useApp().isModerator;
