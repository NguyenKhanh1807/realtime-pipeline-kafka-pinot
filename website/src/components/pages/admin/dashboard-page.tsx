'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { DashboardTemplate } from '@/src/components/templates';
import { useIsAdmin, useIsAuthenticated } from '@/src/contexts';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Target,
  Users,
  Truck,
  Building2,
} from 'lucide-react';
import {
  FraudMetricsOverview,
  FraudAlertsPanel,
  GeographicAnalysis,
  AnalyticsGrid,
} from '@/src/components/organisms';
import {
  QuickAccessCards,
  StatsGrid,
  TransactionAnalysis,
  FraudRiskAnalysis,
  RecentFraudAlerts,
} from '@/src/components/molecules';
import {
  Typography,
  StatCardProps,
  QuickAccessCardProps,
  AnalysisItemProps,
  TransactionAnalysisCardProps,
  FraudRiskCardProps,
  type ActivityItemProps,
} from '@/src/components/atoms';
import { useDashboardAnalytics } from '@/src/hooks/use-dashboard-analytics';
import { useRealtimeTransactions } from '@/src/hooks/use-realtime-transactions';
import { Loading } from '@/src/components/atoms';
import { DashboardTransformer } from '@/src/view-models';

export default function DashboardPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();

  // Use real-time dashboard analytics hook
  const {
    analytics,
    isLoading,
    error,
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

  const quickAccessCards: QuickAccessCardProps[] = [
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
  ];

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

  return (
    <DashboardTemplate>
      {/* Real-time Fraud Alerts Panel */}
      <FraudAlertsPanel />

      <div className="space-y-8">
        {/* Quick Access Cards */}
        {isAdmin && <QuickAccessCards cards={quickAccessCards} />}

        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Loading State */}
        {isLoading && !analytics && (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <Typography variant="p" className="text-destructive">
              Error loading analytics: {error}
            </Typography>
          </div>
        )}

        {/* Fraud Analytics Overview */}
        {(analytics || allTransactions.length > 0) && (
          <div className="bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Fraud Detection Metrics Overview
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Comprehensive view of fraud detection performance and trends (Real-time from transactions)
            </Typography>
            <FraudMetricsOverview
              data={fraudMetrics.hourlyTrends}
              totalTransactions={fraudMetrics.totalTransactions}
              fraudulentTransactions={fraudMetrics.fraudulentTransactions}
              fraudRate={fraudMetrics.fraudRate}
            />
          </div>
        )}

        {/* Detailed Analytics Grid */}
        {allTransactions.length > 0 && (
          <AnalyticsGrid
            trendsData={fraudMetrics.hourlyTrends}
            riskFactorsData={riskFactorsData}
          />
        )}

        {/* Geographic Fraud Analysis */}
        {analytics && analytics.geographicData.length > 0 && (
          <GeographicAnalysis
            mapData={analytics.geographicData}
            topCountries={geographicData}
            globalAverageFraudRate={analytics.fraudRate}
          />
        )}

        {/* Transaction Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TransactionAnalysis items={transactionAnalysisItems} />
          <FraudRiskAnalysis items={fraudRiskAnalysisItems} />
        </div>

        {/* Recent Activity */}
        <RecentFraudAlerts activities={recentActivities} />
      </div>
    </DashboardTemplate>
  );
}
