'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useSystemPreference, useThemeStore, ThemeMode, ColorScheme } from '@/src/view-models/stores';

interface ThemeContextValue {
  // Current theme state
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colorScheme: ColorScheme;

  // Actions
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleMode: () => void;

  // Computed values
  themeClass: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const {
    mode,
    resolvedMode,
    colorScheme,
    setMode,
    setColorScheme,
    toggleMode,
    updateSystemPreference,
  } = useThemeStore();

  // Always use dark theme
  const themeClass = 'dark';

  // Apply dark theme to document after hydration
  useEffect(() => {
    // Small delay to ensure hydration script has completed
    const timer = setTimeout(() => {
      const root = document.documentElement;

      // Always add 'dark' class
      root.classList.add('dark');
      root.classList.remove('light');

      // Update data-theme attribute
      root.setAttribute('data-theme', 'dark');
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const value: ThemeContextValue = {
    mode,
    resolvedMode,
    colorScheme,
    setMode,
    setColorScheme,
    toggleMode,
    themeClass,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Convenience hooks for common theme operations
export const useThemeMode = () => useTheme().mode;
export const useResolvedThemeMode = () => useTheme().resolvedMode;
export const useThemeClass = () => useTheme().themeClass;
