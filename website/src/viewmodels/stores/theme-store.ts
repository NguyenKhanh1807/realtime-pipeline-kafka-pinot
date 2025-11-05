import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'neutral' | 'gray' | 'zinc' | 'stone' | 'slate';

export interface ThemeState {
  // Theme mode
  mode: ThemeMode;

  // Color scheme
  colorScheme: ColorScheme;

  // UI preferences
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';

  // Computed values
  resolvedMode: 'light' | 'dark';
  systemPreference: 'light' | 'dark';
}

export interface ThemeActions {
  // Theme actions
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setBorderRadius: (radius: ThemeState['borderRadius']) => void;

  // System preference updates
  updateSystemPreference: (preference: 'light' | 'dark') => void;

  // Utility actions
  toggleMode: () => void;
  resetToDefaults: () => void;
}

export type ThemeStore = ThemeState & ThemeActions;

// Default theme configuration
const defaultTheme: Omit<ThemeState, 'resolvedMode' | 'systemPreference'> = {
  mode: 'system',
  colorScheme: 'neutral',
  borderRadius: 'md',
};

// Helper function to resolve theme mode
const resolveThemeMode = (mode: ThemeMode, systemPreference: 'light' | 'dark'): 'light' | 'dark' => {
  if (mode === 'system') {
    return systemPreference;
  }
  return mode;
};

// Create the theme store with persistence
export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultTheme,
        resolvedMode: 'light',
        systemPreference: 'light',

        // Theme actions
        setMode: (mode) => {
          const { systemPreference } = get();
          const resolvedMode = resolveThemeMode(mode, systemPreference);
          set({ mode, resolvedMode }, false, 'setMode');
        },

        setColorScheme: (colorScheme) => set({ colorScheme }, false, 'setColorScheme'),

        setBorderRadius: (borderRadius) => set({ borderRadius }, false, 'setBorderRadius'),

        // System preference updates
        updateSystemPreference: (systemPreference) => {
          const { mode } = get();
          const resolvedMode = resolveThemeMode(mode, systemPreference);
          set({ systemPreference, resolvedMode }, false, 'updateSystemPreference');
        },

        // Utility actions
        toggleMode: () => {
          const { mode, systemPreference } = get();
          let newMode: ThemeMode;

          // Simple toggle between light and dark (ignore system mode)
          if (mode === 'light' || mode === 'system') {
            // If currently light or system, switch to dark
            newMode = 'dark';
          } else {
            // If currently dark, switch to light
            newMode = 'light';
          }

          const resolvedMode = resolveThemeMode(newMode, systemPreference);
          set({ mode: newMode, resolvedMode }, false, 'toggleMode');
        },

        resetToDefaults: () => {
          const { systemPreference } = get();
          const resolvedMode = resolveThemeMode(defaultTheme.mode, systemPreference);
          set({
            ...defaultTheme,
            resolvedMode,
          }, false, 'resetToDefaults');
        },
      }),
      {
        name: 'theme-store',
        partialize: (state) => ({
          mode: state.mode,
          colorScheme: state.colorScheme,
          borderRadius: state.borderRadius,
        }),
      }
    ),
    {
      name: 'theme-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for optimized re-renders
export const useThemeMode = () => useThemeStore((state) => state.mode);
export const useResolvedTheme = () => useThemeStore((state) => state.resolvedMode);
export const useColorScheme = () => useThemeStore((state) => state.colorScheme);
export const useBorderRadius = () => useThemeStore((state) => state.borderRadius);

// Custom hook for theme-aware class names
export const useThemeClass = () => {
  const resolvedMode = useResolvedTheme();
  return resolvedMode === 'dark' ? 'dark' : '';
};

// Hook to get the current system preference
export const useSystemPreference = () => {
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const updatePreference = () => {
        setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
      };

      // Set initial value
      updatePreference();

      // Listen for changes
      mediaQuery.addEventListener('change', updatePreference);

      return () => mediaQuery.removeEventListener('change', updatePreference);
    }
  }, []);

  return systemPreference;
};
