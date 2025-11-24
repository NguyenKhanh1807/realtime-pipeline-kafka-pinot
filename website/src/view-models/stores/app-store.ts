import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AuthCommands } from '@/src/view-models/commands/auth-commands';

// Types for the app store
export interface User {
  // Primary identifier
  username: string;
  id: string; // Keep for backward compatibility (maps to username)
  
  // API fields
  component?: string;
  role: 'admin' | 'user' | 'moderator';
  
  // UI convenience fields
  email?: string;
  avatar?: string;
  createdAt?: Date;
}

export interface RegisterData {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean; // Track if app has been initialized

  // App state
  sidebarOpen: boolean;
  currentPage: string;
}

export interface AppActions {
  // User actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;

  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // App actions
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;

      // Async actions
      login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  initializeApp: () => Promise<void>;
}

export type AppStore = AppState & AppActions;

// Initial state - start with empty state to match server render
// This prevents hydration mismatches
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false, // Will be set to true after client-side hydration
  sidebarOpen: false,
  currentPage: '/',
};

// Create the store with devtools for debugging
export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // User actions
      setUser: (user) => set({ user, isAuthenticated: !!user }, false, 'setUser'),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }, false, 'setAuthenticated'),

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
      setError: (error) => set({ error, isLoading: false }, false, 'setError'),
      clearError: () => set({ error: null }, false, 'clearError'),

      // App actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
      setCurrentPage: (page) => set({ currentPage: page }, false, 'setCurrentPage'),

      // Async actions (business logic)
      // Delegate to AuthCommands which uses Model layer
      login: async (credentials) => {
        await AuthCommands.login(credentials);
      },

      register: async (userData) => {
        // Delegate to AuthCommands.register for consistency
        // This method is kept for backward compatibility but AuthCommands.register should be used directly
        await AuthCommands.register(userData);
      },

      logout: () => {
        const { setUser, setAuthenticated, setError } = get();
        setUser(null);
        setAuthenticated(false);
        setError(null);
        // Clear persisted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
        }
      },

      initializeApp: async () => {
        const { isInitialized, setUser, setAuthenticated } = get();

        // Already initialized, skip
        if (isInitialized) {
          return;
        }

        try {
          // Hydrate state from localStorage (client-side only)
          if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('user');
          const savedAuth = localStorage.getItem('isAuthenticated');

          if (savedUser && savedAuth === 'true') {
              try {
                const parsedUser = JSON.parse(savedUser);
                // Ensure user has required fields
                if (parsedUser && parsedUser.username && parsedUser.id && parsedUser.role) {
            // Convert createdAt string back to Date object if it exists
                  if (parsedUser.createdAt) {
                    parsedUser.createdAt = new Date(parsedUser.createdAt);
            }
                  setUser(parsedUser);
            setAuthenticated(true);
                } else {
                  // Invalid user data, clear it
                  localStorage.removeItem('user');
                  localStorage.removeItem('isAuthenticated');
                }
              } catch (parseError) {
                // Invalid JSON, clear it
                console.error('Failed to parse saved user:', parseError);
                localStorage.removeItem('user');
                localStorage.removeItem('isAuthenticated');
              }
            }
          }
        } catch (error) {
          console.error('Failed to initialize app:', error);
        } finally {
          // Mark as initialized after hydration completes
          set({ isInitialized: true }, false, 'setInitialized');
        }
      },
    }),
    {
      name: 'app-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for optimized re-renders
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCurrentPage = () => useAppStore((state) => state.currentPage);
