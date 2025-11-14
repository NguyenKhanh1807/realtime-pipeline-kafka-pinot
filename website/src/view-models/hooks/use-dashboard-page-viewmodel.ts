/**
 * Dashboard Page ViewModel Hook
 * Encapsulates all business logic and data transformations for the dashboard page
 * Follows MVVM pattern by separating presentation logic from view components
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardAnalytics } from '@/src/hooks/use-dashboard-analytics';
import { useRealtimeTransactions } from '@/src/hooks/use-realtime-transactions';
import { DashboardTransformer } from '@/src/view-models/transformers';
import {
  Shield,
  CreditCard,
  Users,
} from 'lucide-react';
import type {
  StatCardProps,
  QuickAccessCardProps,
  TransactionAnalysisCardProps,
  FraudRiskCardProps,
  ActivityItemProps,
} from '@/src/components/atoms';

export interface DashboardPageViewModel {
  // Data
  analytics: ReturnType<typeof useDashboardAnalytics>['analytics'];
  allTransactions: ReturnType<typeof useRealtimeTransactions>['allTransactions'];
  isLoading: boolean;
  error: string | null;

  // Computed values
  fraudMetrics: ReturnType<typeof DashboardTransformer.calculateFraudMetrics>;
  geographicData: ReturnType<typeof DashboardTransformer.transformGeographicData>;
  stats: StatCardProps[];
  quickAccessCards: QuickAccessCardProps[];
  transactionAnalysisItems: TransactionAnalysisCardProps[];
  fraudRiskAnalysisItems: FraudRiskCardProps[];
  riskFactorsData: ReturnType<typeof DashboardTransformer.calculateRiskFactors>;
  recentActivities: ActivityItemProps[];
}

/**
 * ViewModel hook for Dashboard Page
 * Extracts all business logic and data transformations from the page component
 */
export function useDashboardPageViewModel(): DashboardPageViewModel {
  const router = useRouter();

  // Use real-time dashboard analytics hook
  const {
    analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = useDashboardAnalytics({
    autoStart: true,
    pollInterval: 5000, // Update every 5 seconds
  });

  // Use real-time transactions hook
  const {
    allTransactions,
    isPolling: isTransactionsPolling,
  } = useRealtimeTransactions({
    autoStart: true,
    pollInterval: 5000, // Update every 5 seconds
  });

  // Calculate fraud metrics using ViewModel transformer
  const fraudMetrics = useMemo(() => {
    return DashboardTransformer.calculateFraudMetrics(allTransactions);
  }, [allTransactions]);

  // Prepare geographic data using ViewModel transformer
  const geographicData = useMemo(() => {
    if (!analytics) return [];
    return DashboardTransformer.transformGeographicData(analytics);
  }, [analytics]);

  // Fraud-focused stats using ViewModel transformer
  const stats: StatCardProps[] = useMemo(() => {
    return DashboardTransformer.toStatsCards(allTransactions);
  }, [allTransactions]);

  // Quick access cards configuration
  const quickAccessCards: QuickAccessCardProps[] = useMemo(() => [
    {
      title: 'Check Transaction',
      description: 'Analyze credit card transactions for fraud',
      icon: Shield,
      color: 'blue',
      onClick: () => router.push('/fraud-detection'),
    },
    {
      title: 'All Transactions',
      description: 'View complete transaction history',
      icon: CreditCard,
      color: 'green',
      onClick: () => router.push('/transactions'),
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      color: 'purple',
      onClick: () => router.push('/user-management'),
    },
  ], [router]);

  // Transform transactions into transaction analysis items using ViewModel transformer
  const transactionAnalysisItems: TransactionAnalysisCardProps[] = useMemo(() => {
    return DashboardTransformer.toTransactionAnalysisItems(allTransactions);
  }, [allTransactions]);

  // Transform transactions into fraud risk analysis items using ViewModel transformer
  const fraudRiskAnalysisItems: FraudRiskCardProps[] = useMemo(() => {
    return DashboardTransformer.toFraudRiskAnalysisItems(allTransactions);
  }, [allTransactions]);

  // Calculate risk factors data using ViewModel transformer
  const riskFactorsData = useMemo(() => {
    return DashboardTransformer.calculateRiskFactors(allTransactions);
  }, [allTransactions]);

  // Transform transactions into recent activities using ViewModel transformer
  const recentActivities: ActivityItemProps[] = useMemo(() => {
    return DashboardTransformer.toRecentActivities(allTransactions, 5);
  }, [allTransactions]);

  // Combine loading states
  const isLoading = isAnalyticsLoading || isTransactionsPolling;
  
  // Combine error states
  const error = analyticsError || null;

  return {
    // Data
    analytics,
    allTransactions,
    isLoading,
    error,

    // Computed values
    fraudMetrics,
    geographicData,
    stats,
    quickAccessCards,
    transactionAnalysisItems,
    fraudRiskAnalysisItems,
    riskFactorsData,
    recentActivities,
  };
}

