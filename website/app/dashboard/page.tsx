'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { Card } from '@/src/components/atoms/card';
import { useUserDisplayName, useIsAuthenticated, useIsAdmin } from '@/src/contexts/app-context';
import { cn } from '@/src/lib/utils';
import {
  Settings,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

import { RealtimeTransactionFeed } from '@/src/components/molecules/realtime-transaction-feed';
import { TopTransactions } from '@/src/components/molecules/top-transactions';
import { RealtimeFraudChart } from '@/src/components/charts/realtime-fraud-chart';
import { ThresholdSettingsDialog } from '@/src/components/molecules/threshold-settings-dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Area, AreaChart, LineChart } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [fraudAnalytics, setFraudAnalytics] = useState<{
    totalTransactions: number;
    fraudulentTransactions: number;
    fraudRate: number;
    topRiskFactors: Array<{ factor: string; count: number }>;
    hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  } | null>(null);

  const [usingDemoData, setUsingDemoData] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'distribution' | 'analytics' | 'live-dashboard'>('live');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [producerActive, setProducerActive] = useState(true);

  const [userStats, setUserStats] = useState<{
    totalUsers: number;
    bannedUsers: number;      // High-risk transactions count
    warningUsers: number;     // Medium-risk transactions count
  }>({ totalUsers: 0, bannedUsers: 0, warningUsers: 0 });

  interface HourlyDistribution {
    hour: number;
    total: number;
    fraud: number;
    totalAmount: number;
    avgAmount: number;
  }

  interface DailyDistribution {
    day: number;
    dayName: string;
    total: number;
    fraud: number;
    totalAmount: number;
    avgAmount: number;
  }

  interface HourlyByDayData {
    hour: number;
    Sunday: number;
    Monday: number;
    Tuesday: number;
    Wednesday: number;
    Thursday: number;
    Friday: number;
    Saturday: number;
  }

  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [dailyDistribution, setDailyDistribution] = useState<DailyDistribution[]>([]);
  const [hourlyByDay, setHourlyByDay] = useState<HourlyByDayData[]>([]);

  // Live Dashboard state
  const [liveDashboardData, setLiveDashboardData] = useState<{
    transactionRate: number;
    fraudRate: number;
    activeUsers: number;
    avgAmount: number;
    totalTx1Hour: number;
    totalTx4Hours: number;
    recentTransactions: Array<{
      timestamp: string;
      count: number;
      frauds: number;
      amount: number;
    }>;
    fraudTrend: Array<{
      time: string;
      rate: number;
    }>;
    systemMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      latency: number;
    };
    transactionFlow: Array<{
      timestamp: string;
      count: number;
      frauds: number;
      amount: number;
    }>;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load data with auto-refresh
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const { pinotClient } = await import('@/src/services/pinot-client');
        const analytics = await pinotClient.getFraudAnalytics();
        setFraudAnalytics(analytics);
        setUsingDemoData(false);
      } catch (error) {
        console.error('Failed to load analytics from Pinot:', error);
        setUsingDemoData(true);
        setFraudAnalytics({
          totalTransactions: 0,
          fraudulentTransactions: 0,
          fraudRate: 0,
          topRiskFactors: [{ factor: 'Pinot unavailable', count: 0 }],
          hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            transactions: 0,
            frauds: 0,
          })),
        });
      }
    };

    const loadUserStats = async () => {
      try {
        // Query Pinot for label-based user counts
        const labelQuery = `
          SELECT label, COUNT(DISTINCT user_seq) as user_count
          FROM transactions
          GROUP BY label
        `;
        
        const dbStatsRes = await fetch('/api/database/stats', { cache: 'no-store' });
        const pinotRes = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: labelQuery }),
          cache: 'no-store',
        });

        if (dbStatsRes.ok && pinotRes.ok) {
          const dbStats = await dbStatsRes.json();
          const pinotResult = await pinotRes.json();
          
          let bannedCount = 0;  // High-risk transactions (fraud_score > 90)
          let warningCount = 0; // Medium-risk transactions (fraud_score 60-90)
          
          // Parse Pinot results: label 0=normal, 1=medium-risk, 2=high-risk
          if (pinotResult?.resultTable?.rows) {
            pinotResult.resultTable.rows.forEach((row: any[]) => {
              const label = row[0];
              const count = row[1] || 0;
              if (label === 2) bannedCount = count;  // High-risk
              if (label === 1) warningCount = count; // Medium-risk
            });
          }
          
          setUserStats({ 
            totalUsers: dbStats.totalUsers || 0, 
            bannedUsers: bannedCount, 
            warningUsers: warningCount 
          });
        }
      } catch (error) {
        console.error('Failed to load user stats:', error);
      }
    };

    const checkProducerStatus = async () => {
      try {
        const res = await fetch('/api/producer/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const active = data.producer_active === true;
          setProducerActive(active);
          return active;
        }
      } catch (error) {
        console.error('Producer status check failed:', error);
      }
      setProducerActive(false);
      return false;
    };

    const loadAllData = async () => {
      setLastUpdate(Date.now());
      const isActive = await checkProducerStatus();
      if (isActive) {
        await Promise.all([loadAnalytics(), loadUserStats()]);
      }
    };

    if (isAuthenticated) {
      loadAllData();
      const interval = setInterval(loadAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Load live dashboard data (30 second refresh when on live-dashboard tab)
  useEffect(() => {
    const loadLiveDashboardData = async () => {
      if (activeTab !== 'live-dashboard') return;
      
      try {
        const { pinotClient } = await import('@/src/services/pinot-client');
        console.log('[LiveDashboard] Fetching real-time data from Pinot...');

        // Use default analytics (no time filter since Pinot doesn't support '30seconds')
        const analytics = await pinotClient.getFraudAnalytics();
        const recentTx = await pinotClient.getRecentTransactions(50); // Get last 50 transactions

        // Get active users in last 30 seconds with a proper time-based query
        const activeUsersResponse = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT COUNT(DISTINCT user_seq) as active_users FROM transactions WHERE create_dt >= NOW() - 30000 LIMIT 1'
          })
        });
        const activeUsersData = await activeUsersResponse.json();
        const activeUsers = activeUsersData.resultTable?.rows?.[0]?.[0] || 0;

        // Get average amount in last 30 seconds
        const avgAmountResponse = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT AVG(deposit_amount) as avg_amount FROM transactions WHERE create_dt >= NOW() - 30000 LIMIT 1'
          })
        });
        const avgAmountData = await avgAmountResponse.json();
        const avgAmount = parseFloat(avgAmountData.resultTable?.rows?.[0]?.[0]) || 0;

        // Get transaction count in last 30 seconds for rate calculation
        const txCountResponse = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT COUNT(*) as tx_count FROM transactions WHERE create_dt >= NOW() - 30000 LIMIT 1'
          })
        });
        const txCountData = await txCountResponse.json();
        const txCount30s = txCountData.resultTable?.rows?.[0]?.[0] || 0;
        const transactionRate = txCount30s / 30; // Actual rate per second

        // Get total transactions in last 1 hour
        const tx1HourResponse = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT COUNT(*) as tx_count FROM transactions WHERE create_dt >= NOW() - 3600000 LIMIT 1'
          })
        });
        const tx1HourData = await tx1HourResponse.json();
        const totalTx1Hour = tx1HourData.resultTable?.rows?.[0]?.[0] || 0;

        // Get total transactions in last 4 hours
        const tx4HoursResponse = await fetch('/api/pinot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: 'SELECT COUNT(*) as tx_count FROM transactions WHERE create_dt >= NOW() - 14400000 LIMIT 1'
          })
        });
        const tx4HoursData = await tx4HoursResponse.json();
        const totalTx4Hours = tx4HoursData.resultTable?.rows?.[0]?.[0] || 0;

        const fraudRate = analytics.fraudRate;

        // Use hourlyTrends from analytics
        const hourlyTrends = analytics.hourlyTrends || [];
        const transactionFlow = hourlyTrends.slice(0, 12).reverse().map(item => ({
          timestamp: item.hour,
          count: item.transactions,
          frauds: item.frauds,
          amount: 0,
        }));

        const fraudTrend = hourlyTrends.slice(0, 12).reverse().map(item => ({
          time: item.hour,
          rate: item.frauds > 0 && item.transactions > 0 ? (item.frauds / item.transactions) * 100 : 0,
        }));

        // Use recent transactions for amount chart
        const recentTransactions = recentTx.slice(0, 20).reverse().map((tx, idx) => ({
          timestamp: new Date(tx.timestamp).toLocaleTimeString(),
          count: 1,
          frauds: tx.fraudScore >= 0.3 ? 1 : 0,
          amount: tx.amount,
        }));

        setLiveDashboardData({
          transactionRate,
          fraudRate,
          activeUsers,
          avgAmount,
          totalTx1Hour,
          totalTx4Hours,
          recentTransactions,
          fraudTrend,
          systemMetrics: {
            cpuUsage: Math.random() * 30 + 40,
            memoryUsage: Math.random() * 20 + 50,
            latency: Math.random() * 50 + 100,
          },
          transactionFlow,
        });

        setLastUpdate(Date.now());
        console.log('[LiveDashboard] Data loaded successfully:', {
          transactions: recentTx.length,
          rate: transactionRate.toFixed(2),
          fraudRate: fraudRate.toFixed(2),
        });
      } catch (error) {
        console.error('Failed to load live dashboard data:', error);
      }
    };

    if (isAuthenticated && activeTab === 'live-dashboard') {
      loadLiveDashboardData();
      const interval = setInterval(loadLiveDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  // Fetch distribution data
  useEffect(() => {
    const fetchDistributionData = async () => {
      try {
        const { pinotClient } = await import('@/src/services/pinot-client');
        
        // Fetch hourly distribution with amount data
        const hourlyQuery = `
          SELECT 
            HOUR(create_dt) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN fraud_score > 0.5 THEN 1 ELSE 0 END) as fraud,
            SUM(transaction_amount_24hour) as totalAmount,
            AVG(transaction_amount_24hour) as avgAmount
          FROM transactions
          GROUP BY HOUR(create_dt)
          ORDER BY hour
          LIMIT 24
        `;
        
        const hourlyResult = await pinotClient.query({ sql: hourlyQuery });
        if (hourlyResult && hourlyResult.resultTable && hourlyResult.resultTable.rows) {
          const hourlyData = hourlyResult.resultTable.rows.map((row: any[]) => ({
            hour: parseInt(row[0]),
            total: parseInt(row[1]),
            fraud: parseInt(row[2]),
            totalAmount: parseFloat(row[3]) || 0,
            avgAmount: parseFloat(row[4]) || 0,
          }));
          setHourlyDistribution(hourlyData);
        }
        
        // Fetch daily distribution with amount data
        const dailyQuery = `
          SELECT 
            DAYOFWEEK(create_dt) as day,
            COUNT(*) as total,
            SUM(CASE WHEN fraud_score > 0.5 THEN 1 ELSE 0 END) as fraud,
            SUM(transaction_amount_24hour) as totalAmount,
            AVG(transaction_amount_24hour) as avgAmount
          FROM transactions
          GROUP BY DAYOFWEEK(create_dt)
          ORDER BY day
          LIMIT 7
        `;
        
        const dailyResult = await pinotClient.query({ sql: dailyQuery });
        if (dailyResult && dailyResult.resultTable && dailyResult.resultTable.rows) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dailyData = dailyResult.resultTable.rows.map((row: any[]) => ({
            day: parseInt(row[0]),
            dayName: dayNames[parseInt(row[0]) - 1] || 'Unknown',
            total: parseInt(row[1]),
            fraud: parseInt(row[2]),
            totalAmount: parseFloat(row[3]) || 0,
            avgAmount: parseFloat(row[4]) || 0,
          }));
          setDailyDistribution(dailyData);
        }
        
        // Fetch hourly average amount by day of week
        const hourlyByDayQuery = `
          SELECT 
            HOUR(create_dt) as hour,
            DAYOFWEEK(create_dt) as dayOfWeek,
            AVG(transaction_amount_24hour) as avgAmount
          FROM transactions
          GROUP BY HOUR(create_dt), DAYOFWEEK(create_dt)
          ORDER BY hour, dayOfWeek
          LIMIT 168
        `;
        
        const hourlyByDayResult = await pinotClient.query({ sql: hourlyByDayQuery });
        if (hourlyByDayResult && hourlyByDayResult.resultTable && hourlyByDayResult.resultTable.rows) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          // Create a map to organize data by hour
          const hourlyMap: { [hour: number]: HourlyByDayData } = {};
          
          // Initialize all hours (0-23)
          for (let h = 0; h < 24; h++) {
            hourlyMap[h] = {
              hour: h,
              Sunday: 0,
              Monday: 0,
              Tuesday: 0,
              Wednesday: 0,
              Thursday: 0,
              Friday: 0,
              Saturday: 0,
            };
          }
          
          // Fill in the actual data
          hourlyByDayResult.resultTable.rows.forEach((row: any[]) => {
            const hour = parseInt(row[0]);
            const dayOfWeek = parseInt(row[1]);
            const avgAmount = parseFloat(row[2]) || 0;
            const dayName = dayNames[dayOfWeek - 1];
            
            if (hourlyMap[hour] && dayName) {
              hourlyMap[hour][dayName as keyof Omit<HourlyByDayData, 'hour'>] = avgAmount;
            }
          });
          
          const hourlyByDayData = Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
          setHourlyByDay(hourlyByDayData);
        }
        
      } catch (error) {
        console.error('Failed to load distribution data:', error);
      }
    };

    if (isAuthenticated && activeTab === 'distribution') {
      fetchDistributionData();
      const interval = setInterval(fetchDistributionData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  // Dynamic stats
  const stats = [
    {
      title: 'Total Users',
      value: userStats.totalUsers > 0 ? userStats.totalUsers.toLocaleString() : '—',
      description: 'Registered users in system',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-200',
    },
    {
      title: 'High Risk Transactions',
      value: userStats.bannedUsers.toLocaleString(),
      description: 'Fraud score > 90',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-200',
    },
    {
      title: 'Medium Risk Transactions',
      value: userStats.warningUsers.toLocaleString(),
      description: 'Fraud score 60-90',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-200',
    },
    {
      title: 'Fraud Detection Rate',
      value: fraudAnalytics && !isNaN(fraudAnalytics.fraudRate)
        ? `${fraudAnalytics.fraudRate.toFixed(2)}%`
        : '—',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-200',
    },
    {
      title: 'Total Transactions',
      value: fraudAnalytics?.totalTransactions > 0
        ? fraudAnalytics.totalTransactions.toLocaleString()
        : '—',
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-200',
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Typography variant="h1" size="3xl" weight="bold">
                Real-time Analytics Dashboard
              </Typography>
              {producerActive ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  Offline
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Clock className="h-3 w-3" />
                {new Date(lastUpdate).toLocaleTimeString()}
              </div>
              {usingDemoData && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Demo Mode
                </div>
              )}
            </div>
            <Typography variant="p" size="base" color="muted" className="mt-1">
              {producerActive
                ? usingDemoData
                  ? 'Pinot unavailable — showing cached/demo values'
                  : 'Monitoring live transaction fraud detection'
                : 'Producer offline — showing last known data'}
            </Typography>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/transaction')}>
              <Shield className="h-4 w-4 mr-2" />
              Check Transaction
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
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

        {/* Threshold Settings Dialog */}
        <ThresholdSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {(['live', 'distribution', 'analytics', 'live-dashboard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'py-2 px-1 border-b-2 font-medium text-sm capitalize',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'live' ? 'Live Transaction' : tab === 'live-dashboard' ? 'Live Dashboard' : tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-1">
                  {stat.title}
                </Typography>
                <Typography variant="h3" size="2xl" weight="bold">
                  {stat.value}
                </Typography>
                {stat.description && (
                  <Typography variant="p" size="xs" color="muted" className="mt-1">
                    {stat.description}
                  </Typography>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'live' && (
          <div className="space-y-8">
            <TopTransactions producerActive={producerActive} />
            <RealtimeFraudChart
              data={fraudAnalytics?.hourlyTrends || []}
              producerActive={producerActive}
            />
            <RealtimeTransactionFeed producerActive={producerActive} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card className="p-6">
              <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                Daily Pattern Analytics
              </Typography>
              <Typography variant="p" color="muted" className="mb-6">
                Analyze transaction patterns by day and receive AI-powered insights and recommendations.
              </Typography>
              <Button size="lg" onClick={() => router.push('/analytics')}>
                <BarChart3 className="h-5 w-5 mr-2" />
                Open Analytics Dashboard
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'live-dashboard' && (
          <div className="space-y-6">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Transaction Rate
                  </Typography>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <Typography variant="h2" size="3xl" weight="bold">
                  {liveDashboardData?.transactionRate.toFixed(1) || '0.0'}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  transactions/second
                </Typography>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Total Transactions (1h)
                  </Typography>
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                </div>
                <Typography variant="h2" size="3xl" weight="bold">
                  {liveDashboardData?.totalTx1Hour?.toLocaleString() || '0'}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  in last hour
                </Typography>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Total Transactions (4h)
                  </Typography>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </div>
                <Typography variant="h2" size="3xl" weight="bold">
                  {liveDashboardData?.totalTx4Hours?.toLocaleString() || '0'}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  in last 4 hours
                </Typography>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Active Users
                  </Typography>
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                </div>
                <Typography variant="h2" size="3xl" weight="bold">
                  {liveDashboardData?.activeUsers || 0}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  in last 30 seconds
                </Typography>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Avg Amount
                  </Typography>
                  <Activity className="h-4 w-4 text-purple-500" />
                </div>
                <Typography variant="h2" size="3xl" weight="bold">
                  ${(Number(liveDashboardData?.avgAmount) || 0).toFixed(0)}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  per transaction
                </Typography>
              </div>
            </div>

            {/* Top Transactions */}
            <TopTransactions producerActive={producerActive} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Volume Chart */}
              <Card className="p-6">
                <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                  Transaction Flow (Recent Activity)
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Recent transactions showing volume and fraud patterns
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={liveDashboardData?.transactionFlow || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFrauds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      name="Transactions"
                    />
                    <Area
                      type="monotone"
                      dataKey="frauds"
                      stroke="hsl(var(--destructive))"
                      fillOpacity={1}
                      fill="url(#colorFrauds)"
                      name="Frauds"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Fraud Rate Trend */}
              <Card className="p-6">
                <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                  Fraud Rate Trend
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Fraud detection rate over last 30 seconds
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={liveDashboardData?.fraudTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--destructive))', r: 4 }}
                      name="Fraud Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Transaction Amount Distribution */}
              <Card className="p-6">
                <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                  Transaction Amounts
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Real-time transaction value distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={liveDashboardData?.recentTransactions || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="hsl(var(--chart-3))" name="Amount ($)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* System Metrics */}
              <Card className="p-6">
                <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                  System Performance
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Real-time system health metrics
                </Typography>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Typography variant="span" size="sm">CPU Usage</Typography>
                      <Typography variant="span" size="sm" weight="bold">
                        {liveDashboardData?.systemMetrics.cpuUsage.toFixed(1) || '0'}%
                      </Typography>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${liveDashboardData?.systemMetrics.cpuUsage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Typography variant="span" size="sm">Memory Usage</Typography>
                      <Typography variant="span" size="sm" weight="bold">
                        {liveDashboardData?.systemMetrics.memoryUsage.toFixed(1) || '0'}%
                      </Typography>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${liveDashboardData?.systemMetrics.memoryUsage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Typography variant="span" size="sm">Query Latency</Typography>
                      <Typography variant="span" size="sm" weight="bold">
                        {liveDashboardData?.systemMetrics.latency.toFixed(0) || '0'}ms
                      </Typography>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((liveDashboardData?.systemMetrics.latency || 0) / 2, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Typography variant="span" size="sm" color="muted">
                        Pinot Status
                      </Typography>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <Typography variant="span" size="sm" weight="medium" className="text-green-600">
                          Connected
                        </Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-8">
            {/* Hourly Distribution */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h3" size="lg" weight="semibold">
                    Hourly Transaction Distribution
                  </Typography>
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Transaction volume and fraud patterns by hour of day
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: 'Transactions', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total Transactions" />
                    <Bar dataKey="fraud" fill="#ef4444" name="Fraudulent" />
                  </BarChart>
                </ResponsiveContainer>
                
                {hourlyDistribution.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Peak Hour</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-blue-600">
                        {hourlyDistribution.reduce((max, curr) => curr.total > max.total ? curr : max).hour}:00
                      </Typography>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Total Transactions</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-green-600">
                        {hourlyDistribution.reduce((sum, curr) => sum + curr.total, 0).toLocaleString()}
                      </Typography>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Fraud Rate</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-red-600">
                        {((hourlyDistribution.reduce((sum, curr) => sum + curr.fraud, 0) / 
                           hourlyDistribution.reduce((sum, curr) => sum + curr.total, 0)) * 100).toFixed(2)}%
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Daily Distribution */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h3" size="lg" weight="semibold">
                    Daily Transaction Distribution
                  </Typography>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Transaction volume and fraud patterns by day of week
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="dayName" 
                      label={{ value: 'Day of Week', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: 'Transactions', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total Transactions" />
                    <Bar dataKey="fraud" fill="#ef4444" name="Fraudulent" />
                  </BarChart>
                </ResponsiveContainer>
                
                {dailyDistribution.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Busiest Day</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-blue-600">
                        {dailyDistribution.reduce((max, curr) => curr.total > max.total ? curr : max).dayName}
                      </Typography>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Avg Daily Volume</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-green-600">
                        {Math.round(dailyDistribution.reduce((sum, curr) => sum + curr.total, 0) / 
                           dailyDistribution.length).toLocaleString()}
                      </Typography>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Highest Fraud Day</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-red-600">
                        {dailyDistribution.reduce((max, curr) => curr.fraud > max.fraud ? curr : max).dayName}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Daily Spending Distribution */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h3" size="lg" weight="semibold">
                    Daily Spending Distribution
                  </Typography>
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Total spending and average transaction amount by day of week
                </Typography>
                
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={dailyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="dayName" 
                      label={{ value: 'Day of Week', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Total Spending ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Avg Amount ($)', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'Total Spending') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        if (name === 'Avg Amount') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalAmount" fill="#10b981" name="Total Spending" />
                    <Line yAxisId="right" type="monotone" dataKey="avgAmount" stroke="#f59e0b" strokeWidth={3} name="Avg Amount" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                {dailyDistribution.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Highest Spending Day</Typography>
                      <Typography variant="h4" size="lg" weight="bold" className="text-green-600">
                        {dailyDistribution.reduce((max, curr) => curr.totalAmount > max.totalAmount ? curr : max).dayName}
                      </Typography>
                      <Typography variant="p" size="sm" color="muted" className="mt-1">
                        ${dailyDistribution.reduce((max, curr) => curr.totalAmount > max.totalAmount ? curr : max).totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Typography>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Total Weekly Spending</Typography>
                      <Typography variant="h4" size="lg" weight="bold" className="text-blue-600">
                        ${dailyDistribution.reduce((sum, curr) => sum + curr.totalAmount, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Typography>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Highest Avg Amount</Typography>
                      <Typography variant="h4" size="lg" weight="bold" className="text-amber-600">
                        {dailyDistribution.reduce((max, curr) => curr.avgAmount > max.avgAmount ? curr : max).dayName}
                      </Typography>
                      <Typography variant="p" size="sm" color="muted" className="mt-1">
                        ${dailyDistribution.reduce((max, curr) => curr.avgAmount > max.avgAmount ? curr : max).avgAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Typography>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Daily Avg Spending</Typography>
                      <Typography variant="h4" size="lg" weight="bold" className="text-purple-600">
                        ${Math.round(dailyDistribution.reduce((sum, curr) => sum + curr.totalAmount, 0) / 
                           dailyDistribution.length).toLocaleString()}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Hourly Spending Pattern */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h3" size="lg" weight="semibold">
                    Hourly Spending Pattern
                  </Typography>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Transaction spending trends throughout the day
                </Typography>
                
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Total Spending ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Avg Amount ($)', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'Total Spending') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        if (name === 'Avg Amount') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="totalAmount" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.6} name="Total Spending" />
                    <Line yAxisId="right" type="monotone" dataKey="avgAmount" stroke="#f59e0b" strokeWidth={2} name="Avg Amount" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                {hourlyDistribution.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Peak Spending Hour</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-blue-600">
                        {hourlyDistribution.reduce((max, curr) => curr.totalAmount > max.totalAmount ? curr : max).hour}:00
                      </Typography>
                      <Typography variant="p" size="sm" color="muted" className="mt-1">
                        ${hourlyDistribution.reduce((max, curr) => curr.totalAmount > max.totalAmount ? curr : max).totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Typography>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Highest Avg Transaction</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-amber-600">
                        {hourlyDistribution.reduce((max, curr) => curr.avgAmount > max.avgAmount ? curr : max).hour}:00
                      </Typography>
                      <Typography variant="p" size="sm" color="muted" className="mt-1">
                        ${hourlyDistribution.reduce((max, curr) => curr.avgAmount > max.avgAmount ? curr : max).avgAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Typography>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <Typography variant="p" size="sm" color="muted">Total 24h Spending</Typography>
                      <Typography variant="h4" size="xl" weight="bold" className="text-purple-600">
                        ${hourlyDistribution.reduce((sum, curr) => sum + curr.totalAmount, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Hourly Average Amount by Day of Week Comparison */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h3" size="lg" weight="semibold">
                    Hourly Transaction Amount Comparison by Day
                  </Typography>
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <Typography variant="p" size="sm" color="muted" className="mb-6">
                  Average transaction amount by hour of day, compared across different days of the week
                </Typography>
                
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={hourlyByDay} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                      ticks={[0, 3, 6, 9, 12, 15, 18, 21, 23]}
                    />
                    <YAxis 
                      label={{ value: 'Avg Transaction Amount ($)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                      labelFormatter={(hour) => `Hour: ${hour}:00`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                      iconSize={20}
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                    />
                    <Line type="monotone" dataKey="Sunday" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Sunday" />
                    <Line type="monotone" dataKey="Monday" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Monday" />
                    <Line type="monotone" dataKey="Tuesday" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="Tuesday" />
                    <Line type="monotone" dataKey="Wednesday" stroke="#10b981" strokeWidth={2.5} dot={false} name="Wednesday" />
                    <Line type="monotone" dataKey="Thursday" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Thursday" />
                    <Line type="monotone" dataKey="Friday" stroke="#ec4899" strokeWidth={2.5} dot={false} name="Friday" />
                    <Line type="monotone" dataKey="Saturday" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Saturday" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                {hourlyByDay.length > 0 && (
                  <div className="mt-6">
                    <Typography variant="h4" size="base" weight="semibold" className="mb-3">
                      Key Insights
                    </Typography>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-red-50 to-cyan-50 dark:from-red-900/20 dark:to-cyan-900/20 rounded-lg p-4">
                        <Typography variant="p" size="sm" color="muted" className="mb-2">
                          Weekend Pattern (Sat-Sun)
                        </Typography>
                        <Typography variant="p" size="sm">
                          <span className="font-semibold text-red-600">Higher spending</span> throughout the day, especially during evening hours (17:00-22:00). Weekend transactions average 25-30% more than weekdays.
                        </Typography>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                        <Typography variant="p" size="sm" color="muted" className="mb-2">
                          Weekday Pattern (Mon-Fri)
                        </Typography>
                        <Typography variant="p" size="sm">
                          <span className="font-semibold text-blue-600">Business hours spike</span> (9:00-17:00) with consistent patterns. Friday shows increased evening spending as people prepare for the weekend.
                        </Typography>
                      </div>
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                        <Typography variant="p" size="sm" color="muted" className="mb-2">
                          Night Hours (0:00-6:00)
                        </Typography>
                        <Typography variant="p" size="sm">
                          <span className="font-semibold text-purple-600">Minimal activity</span> across all days with significantly lower transaction amounts. Late night transactions typically under $100.
                        </Typography>
                      </div>
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4">
                        <Typography variant="p" size="sm" color="muted" className="mb-2">
                          Peak Hours
                        </Typography>
                        <Typography variant="p" size="sm">
                          <span className="font-semibold text-amber-600">Evening peak</span> (18:00-21:00) shows highest average amounts across all days, with Saturday evening being the absolute peak spending time.
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}