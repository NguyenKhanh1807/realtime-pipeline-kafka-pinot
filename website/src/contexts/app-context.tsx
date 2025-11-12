'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/src/viewmodels/stores';
import type { User } from '@/src/viewmodels/stores/app-store';

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
    login,
    logout,
    setSidebarOpen,
    setCurrentPage,
    clearError,
    initializeApp,
  } = useAppStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Computed values
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const userDisplayName = user?.name
    ? `${user.name.first} ${user.name.last}`.trim()
    : user?.email || 'Guest';

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
