// Export all contexts and providers
export { ThemeProvider, useTheme, useThemeMode, useResolvedThemeMode, useThemeClass } from './theme-context';
export { AppProvider, useApp, useUser, useIsAuthenticated, useIsLoading, useError, useSidebarOpen, useCurrentPage, useUserDisplayName, useIsAdmin, useIsModerator } from './app-context';

// Combined provider for convenience
import React from 'react';
import { ThemeProvider } from './theme-context';
import { AppProvider } from './app-context';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </ThemeProvider>
  );
};
