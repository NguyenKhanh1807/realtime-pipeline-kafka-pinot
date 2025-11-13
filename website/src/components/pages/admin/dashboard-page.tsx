'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  type StatCardProps,
  type QuickAccessCardProps,
  type AnalysisItemProps,
  type ActivityItemProps,
} from '@/src/components/atoms';

export default function DashboardPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isAuthenticated = useIsAuthenticated();
  const [fraudAnalytics, setFraudAnalytics] = useState<{
    totalTransactions: number;
    fraudulentTransactions: number;
    fraudRate: number;
    topRiskFactors: Array<{ factor: string; count: number }>;
    hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  } | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Load fraud analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const { pinotClient } = await import('@/src/services/pinot-client');
        const analytics = await pinotClient.getFraudAnalytics();
        setFraudAnalytics(analytics);
      } catch (error) {
        // Server unavailable is expected in demo/development - use fallback data silently
        // Only log unexpected errors, not SERVER_UNAVAILABLE which is expected
        if (process.env.NODE_ENV === 'development' && error instanceof Error && error.message !== 'SERVER_UNAVAILABLE') {
          console.warn('Unexpected error loading analytics:', error);
        }
        setUsingDemoData(true);
        setFraudAnalytics({
          totalTransactions: 1247,
          fraudulentTransactions: 23,
          fraudRate: 1.84,
          topRiskFactors: [
            { factor: 'High amount transaction', count: 8 },
            { factor: 'Unusual merchant location', count: 6 },
            { factor: 'New customer pattern', count: 5 },
          ],
          hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            transactions: Math.floor(Math.random() * 100) + 20,
            frauds: Math.floor(Math.random() * 5),
          })),
        });
      }
    };

    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated]);

  // Fraud-focused stats
  const stats: StatCardProps[] = [
    {
      title: 'Total Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.totalTransactions)
        ? fraudAnalytics.totalTransactions.toLocaleString()
        : '1,247',
      change: '+15%',
      changeType: 'positive',
      icon: CreditCard,
    },
    {
      title: 'Fraudulent Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.fraudulentTransactions)
        ? fraudAnalytics.fraudulentTransactions.toString()
        : '23',
      change: '-8%',
      changeType: 'positive',
      icon: AlertTriangle,
    },
    {
      title: 'Fraud Detection Rate',
      value: fraudAnalytics && !isNaN(fraudAnalytics.fraudRate)
        ? `${fraudAnalytics.fraudRate}%`
        : '1.84%',
      change: '+5%',
      changeType: 'positive',
      icon: Target,
    },
    {
      title: 'Clean Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.totalTransactions) && !isNaN(fraudAnalytics.fraudulentTransactions)
        ? (fraudAnalytics.totalTransactions - fraudAnalytics.fraudulentTransactions).toLocaleString()
        : '1,224',
      change: '+18%',
      changeType: 'positive',
      icon: CheckCircle,
    },
  ];

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

  const transactionAnalysisItems: AnalysisItemProps[] = [
    {
      label: 'Credit Card Transactions',
      value: 851,
      description: '68% of total volume',
      icon: CreditCard,
    },
    {
      label: 'Digital Wallet Payments',
      value: 275,
      description: '22% of total volume',
      icon: Target,
    },
    {
      label: 'Bank Transfers',
      value: 121,
      description: '10% of total volume',
      icon: CreditCard,
    },
    {
      label: 'Other',
      value: 100,
      description: '5% of total volume',
      icon: Truck,
    }
  ];

  const fraudRiskAnalysisItems: AnalysisItemProps[] = [
    {
      label: 'Low Risk',
      value: '1,112',
      description: '89.2% of transactions',
      icon: CheckCircle,
    },
    {
      label: 'Medium Risk',
      value: '94',
      description: '7.5% of transactions',
      icon: AlertTriangle,
    },
    {
      label: 'High Risk',
      value: '35',
      description: '2.8% of transactions',
      icon: AlertTriangle,
    },
    {
      label: 'Critical Risk',
      value: '6',
      description: '0.5% of transactions',
      icon: AlertTriangle,
    },
  ];

  const recentActivities: ActivityItemProps[] = [
    {
      id: '1',
      user: 'TXN-123456789',
      action: 'flagged as high-risk (95% score)',
      time: '2 minutes ago',
      type: 'fraud' as const,
      riskLevel: 'critical' as const,
    },
    {
      id: '2',
      user: 'TXN-987654321',
      action: 'approved - low risk (12% score)',
      time: '5 minutes ago',
      type: 'clean' as const,
      riskLevel: 'low' as const,
    },
    {
      id: '3',
      user: 'TXN-555666777',
      action: 'flagged for review (78% score)',
      time: '8 minutes ago',
      type: 'fraud' as const,
      riskLevel: 'high' as const,
    },
    {
      id: '4',
      user: 'TXN-111222333',
      action: 'approved - medium risk (45% score)',
      time: '12 minutes ago',
      type: 'clean' as const,
      riskLevel: 'medium' as const,
    },
    {
      id: '5',
      user: 'System',
      action: 'fraud model updated',
      time: '15 minutes ago',
      type: 'system' as const,
    },
  ];

  return (
    <DashboardTemplate>
      {/* Real-time Fraud Alerts Panel */}
      <FraudAlertsPanel />

      <div className="space-y-8">
        {/* Quick Access Cards */}
        {isAdmin && <QuickAccessCards cards={quickAccessCards} />}

        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Fraud Analytics Overview */}
        <div className="bg-card border border-border rounded-lg p-6">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
            Fraud Detection Metrics Overview
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
            Comprehensive view of fraud detection performance and trends
          </Typography>
          <FraudMetricsOverview
            data={fraudAnalytics?.hourlyTrends || Array.from({ length: 24 }, (_, i) => ({
              hour: `${i.toString().padStart(2, '0')}:00`,
              transactions: Math.floor(Math.random() * 100) + 20,
              frauds: Math.floor(Math.random() * 5),
            }))}
            totalTransactions={fraudAnalytics?.totalTransactions || 1247}
            fraudulentTransactions={fraudAnalytics?.fraudulentTransactions || 23}
            fraudRate={fraudAnalytics?.fraudRate || 1.84}
          />
        </div>

        {/* Detailed Analytics Grid */}
        <AnalyticsGrid
          trendsData={fraudAnalytics?.hourlyTrends || Array.from({ length: 24 }, (_, i) => ({
                hour: `${i.toString().padStart(2, '0')}:00`,
                transactions: Math.floor(Math.random() * 100) + 20,
                frauds: Math.floor(Math.random() * 5),
              }))}
          riskFactorsData={fraudAnalytics?.topRiskFactors || [
                { factor: 'High amount transaction', count: 8 },
                { factor: 'Unusual merchant location', count: 6 },
                { factor: 'New customer pattern', count: 5 },
                { factor: 'Velocity check failed', count: 4 },
              ]}
            />

        {/* Geographic Fraud Analysis */}
        <GeographicAnalysis
          mapData={[
                { country: 'United States', fraudCount: 45, totalTransactions: 1250, fraudRate: 3.6 },
                { country: 'United Kingdom', fraudCount: 23, totalTransactions: 680, fraudRate: 3.38 },
                { country: 'Germany', fraudCount: 18, totalTransactions: 520, fraudRate: 3.46 },
                { country: 'China', fraudCount: 67, totalTransactions: 1890, fraudRate: 3.55 },
                { country: 'Japan', fraudCount: 12, totalTransactions: 430, fraudRate: 2.79 },
                { country: 'India', fraudCount: 34, totalTransactions: 980, fraudRate: 3.47 },
                { country: 'Canada', fraudCount: 15, totalTransactions: 380, fraudRate: 3.95 },
                { country: 'Australia', fraudCount: 8, totalTransactions: 290, fraudRate: 2.76 },
              ]}
          topCountries={[
                { country: 'Canada', fraudRate: 3.95, totalTransactions: 380, fraudCount: 15, flag: '🇨🇦', rank: 1 },
                { country: 'United States', fraudRate: 3.60, totalTransactions: 1250, fraudCount: 45, flag: '🇺🇸', rank: 2 },
                { country: 'China', fraudRate: 3.55, totalTransactions: 1890, fraudCount: 67, flag: '🇨🇳', rank: 3 },
                { country: 'India', fraudRate: 3.47, totalTransactions: 980, fraudCount: 34, flag: '🇮🇳', rank: 4 },
                { country: 'Germany', fraudRate: 3.46, totalTransactions: 520, fraudCount: 18, flag: '🇩🇪', rank: 5 },
            { country: 'United Kingdom', fraudRate: 3.38, totalTransactions: 680, fraudCount: 23, flag: '🇬🇧', rank: 6 },
            { country: 'France', fraudRate: 3.32, totalTransactions: 450, fraudCount: 15, flag: '🇫🇷', rank: 7 },
            { country: 'Brazil', fraudRate: 3.28, totalTransactions: 720, fraudCount: 24, flag: '🇧🇷', rank: 8 },
            { country: 'Japan', fraudRate: 3.25, totalTransactions: 430, fraudCount: 14, flag: '🇯🇵', rank: 9 },
            { country: 'Australia', fraudRate: 3.21, totalTransactions: 290, fraudCount: 9, flag: '🇦🇺', rank: 10 },
          ]}
        />

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
