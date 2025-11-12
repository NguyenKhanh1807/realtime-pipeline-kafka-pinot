import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { websiteApiClient, type ApiUser } from '@/src/services/website-api';

// Types for the app store
export interface User {
  id: string;
  email: string;
  name?: {
    first: string;
    last: string;
  };
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt?: Date;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

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

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
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
      login: async (credentials) => {
        const { setLoading, setError, setUser, setAuthenticated } = get();

        try {
          setLoading(true);
          setError(null);

          // Call real API
          const response = await websiteApiClient.login({
            username: credentials.username,
            password: credentials.password,
          });

          if (!response.success || !response.user) {
            throw new Error(response.message || 'Login failed');
          }

          // Transform API user to app user format
          const appUser = websiteApiClient.transformApiUser(response.user);

          setUser(appUser);
          setAuthenticated(true);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      register: async (userData) => {
        const { setLoading, setError, setUser, setAuthenticated } = get();

        try {
          setLoading(true);
          setError(null);

          // Simulate API call - replace with actual registration service
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Mock successful registration - replace with actual user creation
          const mockUser: User = {
            id: Date.now().toString(),
            email: userData.email,
            name: {
              first: userData.firstName,
              last: userData.lastName,
            },
            avatar: undefined,
            role: 'user',
            createdAt: new Date(),
          };

          // Save to localStorage for persistence
          localStorage.setItem('user', JSON.stringify(mockUser));
          localStorage.setItem('isAuthenticated', 'true');

          setUser(mockUser);
          setAuthenticated(true);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          setError(errorMessage);
          throw error;
        } finally {
          setLoading(false);
        }
      },

      logout: () => {
        const { setUser, setAuthenticated, setError } = get();
        setUser(null);
        setAuthenticated(false);
        setError(null);
        // Clear any persisted data if needed
      },

      initializeApp: async () => {
        const { setLoading, setUser, setAuthenticated } = get();

        try {
          setLoading(true);

          // Check for existing session/token
          // This would typically check localStorage, cookies, or make an API call
          const savedUser = localStorage.getItem('user');
          const savedAuth = localStorage.getItem('isAuthenticated');

          if (savedUser && savedAuth === 'true') {
            const user = JSON.parse(savedUser);
            // Convert createdAt string back to Date object if it exists
            if (user.createdAt) {
              user.createdAt = new Date(user.createdAt);
            }
            setUser(user);
            setAuthenticated(true);
          }

        } catch (error) {
          console.error('Failed to initialize app:', error);
        } finally {
          setLoading(false);
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
