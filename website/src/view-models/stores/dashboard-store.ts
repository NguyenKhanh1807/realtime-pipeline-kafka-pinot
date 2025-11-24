/**
 * Dashboard Analytics Store
 * Manages dashboard analytics state and operations
 * Uses Model layer (repositories) instead of direct service access
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DashboardCommands } from '@/src/view-models/commands/dashboard-commands';

export interface DashboardAnalytics {
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
  topRiskFactors: Array<{ factor: string; count: number }>;
  hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  geographicData: Array<{
    country: string;
    fraudCount: number;
    totalTransactions: number;
    fraudRate: number;
  }>;
}

export interface DashboardState {
  analytics: DashboardAnalytics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface DashboardActions {
  fetchAnalytics: () => Promise<void>;
  clearError: () => void;
}

export type DashboardStore = DashboardState & DashboardActions;

const initialState: DashboardState = {
  analytics: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchAnalytics: async () => {
        const { isLoading } = get();
        if (isLoading) return; // Prevent concurrent fetches

        try {
          set({ isLoading: true, error: null });

          // Use DashboardCommands which uses Model layer (repositories)
          const analytics = await DashboardCommands.fetchAnalytics();

          set({
            analytics,
            isLoading: false,
            lastUpdated: new Date(),
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'dashboard-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for optimized re-renders
export const useDashboardAnalytics = () => useDashboardStore((state) => state.analytics);
export const useDashboardLoading = () => useDashboardStore((state) => state.isLoading);
export const useDashboardError = () => useDashboardStore((state) => state.error);

