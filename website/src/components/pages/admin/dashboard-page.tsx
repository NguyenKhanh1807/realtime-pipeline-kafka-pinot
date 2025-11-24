'use client';

import { DashboardTemplate } from '@/src/components/templates';
import { useIsAdmin } from '@/src/contexts';
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
  Loading,
} from '@/src/components/atoms';
import { useDashboardPageViewModel } from '@/src/view-models/hooks/use-dashboard-page-viewmodel';

export default function DashboardPage() {
  const isAdmin = useIsAdmin();

  // Use Page ViewModel hook - all logic extracted here
  const {
    analytics,
    allTransactions,
    isLoading,
    error,
    fraudMetrics,
    geographicData,
    stats,
    quickAccessCards,
    transactionAnalysisItems,
    fraudRiskAnalysisItems,
    riskFactorsData,
    recentActivities,
  } = useDashboardPageViewModel();

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
              isRefreshing={isLoading}
            />
          </div>
        )}

        {/* Detailed Analytics Grid */}
        {allTransactions.length > 0 && (
          <AnalyticsGrid
            trendsData={fraudMetrics.hourlyTrends}
            riskFactorsData={riskFactorsData}
            isRefreshing={isLoading}
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
