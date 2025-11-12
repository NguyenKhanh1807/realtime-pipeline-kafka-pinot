'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/src/components/layouts/dashboard-layout';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { useUserDisplayName, useIsAuthenticated, useIsAdmin } from '@/src/contexts/app-context';
import { cn } from '@/src/lib/utils';
import {
  Users,
  Activity,
  TrendingUp,
  Settings,
  User,
  Shield,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Target
} from 'lucide-react';
import { FraudTrendsChart } from '@/src/components/organisms/fraud-trends-chart';
import { RiskFactorsChart } from '@/src/components/organisms/risk-factors-chart';
import { FraudMetricsOverview } from '@/src/components/organisms/fraud-metrics-overview';
import { FraudMap } from '@/src/components/organisms/fraud-map';
import { RealtimeTransactionFeed } from '@/src/components/molecules/realtime-transaction-feed';
import { FraudAlertsPanel } from '@/src/components/molecules/fraud-alerts-panel';

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const userDisplayName = useUserDisplayName();
  const isAdmin = useIsAdmin();
  const [fraudAnalytics, setFraudAnalytics] = useState<{
    totalTransactions: number;
    fraudulentTransactions: number;
    fraudRate: number;
    topRiskFactors: Array<{ factor: string; count: number }>;
    hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  } | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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
  const stats = [
    {
      title: 'Total Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.totalTransactions)
        ? fraudAnalytics.totalTransactions.toLocaleString()
        : '1,247',
      change: '+15%',
      changeType: 'positive' as const,
      icon: CreditCard,
    },
    {
      title: 'Fraudulent Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.fraudulentTransactions)
        ? fraudAnalytics.fraudulentTransactions.toString()
        : '23',
      change: '-8%',
      changeType: 'positive' as const,
      icon: AlertTriangle,
    },
    {
      title: 'Fraud Detection Rate',
      value: fraudAnalytics && !isNaN(fraudAnalytics.fraudRate)
        ? `${fraudAnalytics.fraudRate}%`
        : '1.84%',
      change: '+5%',
      changeType: 'positive' as const,
      icon: Target,
    },
    {
      title: 'Clean Transactions',
      value: fraudAnalytics && !isNaN(fraudAnalytics.totalTransactions) && !isNaN(fraudAnalytics.fraudulentTransactions)
        ? (fraudAnalytics.totalTransactions - fraudAnalytics.fraudulentTransactions).toLocaleString()
        : '1,224',
      change: '+18%',
      changeType: 'positive' as const,
      icon: CheckCircle,
    },
  ];

  const recentActivities = [
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Real-time Fraud Alerts Panel */}
      <FraudAlertsPanel />

      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Typography variant="h1" size="3xl" weight="bold" className="text-foreground">
                Fraud Detection Dashboard
              </Typography>
              {usingDemoData && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium dark:bg-amber-900 dark:text-amber-200">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  Demo Data
                </div>
              )}
            </div>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground mt-1">
              {usingDemoData
                ? "Using demo data - connect to a Pinot server for live analytics."
                : "Monitor real-time transaction analysis and fraud prevention metrics."
              }
            </Typography>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/transaction')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Check Transaction
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            {isAdmin && (
              <Button variant="default" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                      {stat.title}
                    </Typography>
                    <Typography variant="h2" size="2xl" weight="bold" className="text-foreground mt-1">
                      {stat.value}
                    </Typography>
                  </div>
                  <div className={cn(
                    'p-3 rounded-full',
                    stat.changeType === 'positive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <Typography
                    variant="span"
                    size="sm"
                    className={cn(
                      'font-medium',
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {stat.change}
                  </Typography>
                  <Typography variant="span" size="sm" color="muted" className="text-muted-foreground ml-2">
                    from last month
                  </Typography>
                </div>
              </div>
            );
          })}
        </div>

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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Transaction Trends */}
          <div className="xl:col-span-2 bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Transaction Trends (24h)
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Real-time transaction volume and fraud detection patterns over the last 24 hours
            </Typography>
            <FraudTrendsChart
              data={fraudAnalytics?.hourlyTrends || Array.from({ length: 24 }, (_, i) => ({
                hour: `${i.toString().padStart(2, '0')}:00`,
                transactions: Math.floor(Math.random() * 100) + 20,
                frauds: Math.floor(Math.random() * 5),
              }))}
              height={300}
              showCombined={true}
            />
          </div>

          {/* Risk Factor Distribution */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Risk Factor Distribution
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Breakdown of fraud detection triggers by category and frequency
            </Typography>
            <RiskFactorsChart
              data={fraudAnalytics?.topRiskFactors || [
                { factor: 'High amount transaction', count: 8 },
                { factor: 'Unusual merchant location', count: 6 },
                { factor: 'New customer pattern', count: 5 },
                { factor: 'Velocity check failed', count: 4 },
              ]}
              height={300}
            />
          </div>
        </div>

        {/* Geographic Fraud Analysis */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* World Map */}
          <div className="xl:col-span-2 bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Global Fraud Distribution
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Geographic view of fraud rates across major countries and regions
            </Typography>
            <FraudMap
              data={[
                { country: 'United States', fraudCount: 45, totalTransactions: 1250, fraudRate: 3.6 },
                { country: 'United Kingdom', fraudCount: 23, totalTransactions: 680, fraudRate: 3.38 },
                { country: 'Germany', fraudCount: 18, totalTransactions: 520, fraudRate: 3.46 },
                { country: 'China', fraudCount: 67, totalTransactions: 1890, fraudRate: 3.55 },
                { country: 'Japan', fraudCount: 12, totalTransactions: 430, fraudRate: 2.79 },
                { country: 'India', fraudCount: 34, totalTransactions: 980, fraudRate: 3.47 },
                { country: 'Canada', fraudCount: 15, totalTransactions: 380, fraudRate: 3.95 },
                { country: 'Australia', fraudCount: 8, totalTransactions: 290, fraudRate: 2.76 },
              ]}
              height={350}
            />
          </div>

          {/* Top 5 Countries */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Top 5 Risk Countries
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Highest fraud rates by country with detailed metrics
            </Typography>
            <div className="space-y-3">
              {[
                { country: 'Canada', fraudRate: 3.95, totalTransactions: 380, fraudCount: 15, flag: '🇨🇦', rank: 1 },
                { country: 'United States', fraudRate: 3.60, totalTransactions: 1250, fraudCount: 45, flag: '🇺🇸', rank: 2 },
                { country: 'China', fraudRate: 3.55, totalTransactions: 1890, fraudCount: 67, flag: '🇨🇳', rank: 3 },
                { country: 'India', fraudRate: 3.47, totalTransactions: 980, fraudCount: 34, flag: '🇮🇳', rank: 4 },
                { country: 'Germany', fraudRate: 3.46, totalTransactions: 520, fraudCount: 18, flag: '🇩🇪', rank: 5 },
              ].map((country) => (
                <div key={country.country} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    {country.rank}
                  </div>
                  <div className="text-xl">{country.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Typography variant="span" size="sm" weight="medium" className="text-foreground truncate">
                        {country.country}
                      </Typography>
                      <Typography variant="span" size="xs" weight="bold" className={`${
                        country.fraudRate >= 4 ? 'text-red-600' :
                        country.fraudRate >= 3.5 ? 'text-orange-600' :
                        country.fraudRate >= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {country.fraudRate}%
                      </Typography>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                        {country.fraudCount} frauds
                      </Typography>
                      <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                        {country.totalTransactions} total
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-center">
                <Typography variant="h4" size="lg" weight="bold" className="text-red-600">
                  3.45%
                </Typography>
                <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                  Global Average Fraud Rate
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transaction Analysis */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              Transaction Analysis
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Detailed breakdown of transaction types and payment methods
            </Typography>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Credit Card Transactions
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      68% of total volume
                    </Typography>
                  </div>
                </div>
                <Typography variant="h4" size="lg" weight="bold" className="text-foreground">
                  851
                </Typography>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Digital Wallet Payments
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      22% of total volume
                    </Typography>
                  </div>
                </div>
                <Typography variant="h4" size="lg" weight="bold" className="text-foreground">
                  275
                </Typography>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Bank Transfers
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      10% of total volume
                    </Typography>
                  </div>
                </div>
                <Typography variant="h4" size="lg" weight="bold" className="text-foreground">
                  121
                </Typography>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
              System Performance
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
              Real-time system health and processing performance metrics
            </Typography>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  Average Response Time
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                  127ms
                </Typography>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>

              <div className="flex items-center justify-between">
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  System Uptime
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                  99.9%
                </Typography>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>

              <div className="flex items-center justify-between">
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  Fraud Detection Accuracy
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                  94.2%
                </Typography>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '94.2%' }}></div>
              </div>

              <div className="flex items-center justify-between">
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  False Positive Rate
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                  3.1%
                </Typography>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '3.1%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
              Recent Fraud Alerts
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
              Latest fraud detection activities and system events
            </Typography>
          </div>
          <div className="divide-y divide-border">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      activity.riskLevel === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                      activity.riskLevel === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
                      activity.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' :
                      activity.riskLevel === 'low' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                      activity.type === 'system' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    )}>
                      {activity.riskLevel === 'critical' ? <AlertTriangle className="h-4 w-4" /> :
                       activity.riskLevel === 'high' ? <AlertTriangle className="h-4 w-4" /> :
                       activity.riskLevel === 'medium' ? <AlertTriangle className="h-4 w-4" /> :
                       activity.riskLevel === 'low' ? <CheckCircle className="h-4 w-4" /> :
                       activity.type === 'system' ? <Settings className="h-4 w-4" /> :
                       <CreditCard className="h-4 w-4" />}
                    </div>
                    <div>
                      <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                        {activity.user}
                      </Typography>
                      <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                        {activity.action}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Transaction Feed */}
        <RealtimeTransactionFeed />
      </div>
    </DashboardLayout>
  );
}
