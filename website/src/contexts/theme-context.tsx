'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useSystemPreference, useResolvedTheme, useThemeStore } from '@/src/viewmodels/stores';
import type { ThemeMode, ColorScheme } from '@/src/viewmodels/stores/theme-store';

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

  const systemPreference = useSystemPreference();
  const themeClass = resolvedMode === 'dark' ? 'dark' : '';

  // Update system preference when it changes
  useEffect(() => {
    updateSystemPreference(systemPreference);
  }, [systemPreference, updateSystemPreference]);

  // Apply theme to document after hydration
  useEffect(() => {
    // Small delay to ensure hydration script has completed
    const timer = setTimeout(() => {
      const root = document.documentElement;

      // Remove existing theme classes to ensure clean state
      root.classList.remove('light', 'dark');

      // Add 'dark' class only when in dark mode for Tailwind CSS
      if (resolvedMode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Update data-theme attribute for potential CSS custom properties
      root.setAttribute('data-theme', resolvedMode);
    }, 0);

    return () => clearTimeout(timer);
  }, [resolvedMode]);

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
