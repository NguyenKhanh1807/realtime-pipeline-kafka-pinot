/**
 * React hook for real-time dashboard analytics from Pinot
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDashboardStore } from '@/src/view-models/stores';

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

export interface UseDashboardAnalyticsOptions {
  autoStart?: boolean;
  pollInterval?: number;
}

export interface UseDashboardAnalyticsReturn {
  analytics: DashboardAnalytics | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refresh: () => Promise<void>;
}

export function useDashboardAnalytics(
  options: UseDashboardAnalyticsOptions = {}
): UseDashboardAnalyticsReturn {
  const {
    autoStart = true,
    pollInterval = 3000, // Poll every 3 seconds for real-time analytics
  } = options;

  // Use ViewModel store instead of direct service access
  const { analytics, isLoading, error, fetchAnalytics } = useDashboardStore();
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;
    setIsPolling(true);
    fetchAnalytics(); // Initial fetch

    const interval = setInterval(() => {
      fetchAnalytics();
    }, pollInterval);

    pollingIntervalRef.current = interval;
  }, [pollInterval, fetchAnalytics]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]); // Only depend on autoStart to avoid infinite loops

  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refresh,
  };
}

