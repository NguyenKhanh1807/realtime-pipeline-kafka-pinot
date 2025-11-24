/**
 * Realtime Transactions Store
 * ViewModel store for managing real-time transaction updates
 * Uses Model layer (realtimeTransactionService) instead of direct API access
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { realtimeTransactionService, type TransactionUpdate, type TransactionsUpdateCallback } from '@/src/services/realtime-transaction-service';
import type { TransactionHistoryRowProps } from '@/src/components/molecules';

export interface RealtimeTransactionsState {
  transactionUpdates: TransactionUpdate[];
  allTransactions: TransactionHistoryRowProps[];
  isPolling: boolean;
  error: string | null;
}

export interface RealtimeTransactionsActions {
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  clearUpdates: () => void;
  resetTracking: () => void;
  setError: (error: string | null) => void;
}

export type RealtimeTransactionsStore = RealtimeTransactionsState & RealtimeTransactionsActions;

const initialState: RealtimeTransactionsState = {
  transactionUpdates: [],
  allTransactions: [],
  isPolling: false,
  error: null,
};

export const useRealtimeTransactionsStore = create<RealtimeTransactionsStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      startPolling: (intervalMs = 3000) => {
        const { isPolling } = get();
        if (isPolling) return;

        set({ isPolling: true, error: null });

        // Subscribe to individual transaction updates
        const unsubscribeUpdates = realtimeTransactionService.onTransactionUpdate((update) => {
          set((state) => {
            // Check if this transaction ID already exists to prevent duplicates
            const existingIds = new Set(state.transactionUpdates.map(tx => tx.id));
            if (existingIds.has(update.id)) {
              // Transaction already exists, don't add duplicate
              return state;
            }
            // Add new transaction at the beginning, limit to 100
            return {
              transactionUpdates: [update, ...state.transactionUpdates].slice(0, 100),
            };
          });
        });

        // Subscribe to full transactions list updates
        const unsubscribeTransactions = realtimeTransactionService.onTransactionsUpdate((transactions) => {
          set({ allTransactions: transactions });
        });

        // Store unsubscribe functions (would need to be managed properly in real implementation)
        // For now, start polling
        realtimeTransactionService.startPolling(intervalMs);
      },

      stopPolling: () => {
        realtimeTransactionService.stopPolling();
        set({ isPolling: false });
      },

      clearUpdates: () => {
        set({ transactionUpdates: [] });
        realtimeTransactionService.resetTracking();
      },

      resetTracking: () => {
        realtimeTransactionService.resetTracking();
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'realtime-transactions-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for optimized re-renders
export const useRealtimeTransactions = () => useRealtimeTransactionsStore((state) => state.allTransactions);
export const useRealtimeTransactionUpdates = () => useRealtimeTransactionsStore((state) => state.transactionUpdates);
export const useIsPollingTransactions = () => useRealtimeTransactionsStore((state) => state.isPolling);
export const useTransactionsError = () => useRealtimeTransactionsStore((state) => state.error);

