/**
 * React hook for real-time transaction updates from Pinot
 * Uses ViewModel store instead of direct service access
 */

import { useEffect, useCallback } from 'react';
import { 
  useRealtimeTransactionsStore,
  useRealtimeTransactions as useStoreTransactions,
  useRealtimeTransactionUpdates,
  useIsPollingTransactions,
} from '@/src/view-models';
import type { TransactionUpdate } from '@/src/services/realtime-transaction-service';
import type { TransactionHistoryRowProps } from '@/src/components/molecules';
import { realtimeTransactionService } from '@/src/services/realtime-transaction-service';

export interface UseRealtimeTransactionsOptions {
  autoStart?: boolean;
  pollInterval?: number;
  maxUpdates?: number;
}

export interface UseRealtimeTransactionsReturn {
  transactionUpdates: TransactionUpdate[];
  allTransactions: TransactionHistoryRowProps[];
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  clearUpdates: () => void;
  refreshTransactions: () => Promise<void>;
}

export function useRealtimeTransactions(
  options: UseRealtimeTransactionsOptions = {}
): UseRealtimeTransactionsReturn {
  const {
    autoStart = true,
    pollInterval = 3000,
    maxUpdates = 100,
  } = options;

  // Use ViewModel store instead of direct service access
  // Get actions directly from the store hook
  const { startPolling: startPollingAction, stopPolling: stopPollingAction, clearUpdates: clearUpdatesAction, resetTracking } = useRealtimeTransactionsStore();
  const allTransactions = useStoreTransactions();
  const transactionUpdates = useRealtimeTransactionUpdates();
  const isPolling = useIsPollingTransactions();

  // Start/stop polling using store actions
  useEffect(() => {
    if (autoStart) {
      startPollingAction(pollInterval);
    }

    return () => {
      if (autoStart) {
        stopPollingAction();
      }
    };
  }, [autoStart, pollInterval, startPollingAction, stopPollingAction]);

  const startPolling = useCallback(() => {
    startPollingAction(pollInterval);
  }, [pollInterval, startPollingAction]);

  const stopPolling = useCallback(() => {
    stopPollingAction();
  }, [stopPollingAction]);

  const clearUpdates = useCallback(() => {
    clearUpdatesAction();
  }, [clearUpdatesAction]);

  const refreshTransactions = useCallback(async () => {
    resetTracking();
  }, [resetTracking]);

  return {
    transactionUpdates: transactionUpdates.slice(0, maxUpdates),
    allTransactions,
    isPolling,
    startPolling,
    stopPolling,
    clearUpdates,
    refreshTransactions,
  };
}

