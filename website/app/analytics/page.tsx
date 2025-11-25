'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { Typography } from '@/src/components/atoms/typography';
import { Card } from '@/src/components/atoms/card';
import { Button } from '@/src/components/atoms/button';
import { useIsAuthenticated } from '@/src/contexts/app-context';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Shield,
  Clock,
  Globe,
  CreditCard,
  ChevronDown,
  ChevronUp,
  BarChart3,
  LineChart,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface DailyMetrics {
  date: string;
  totalTransactions: number;
  fraudCount: number;
  fraudRate: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  uniqueUsers: number;
  avgTransactionsPerUser: number;
  peakHour: number;
  suspiciousPatterns: string[];
  riskScore: number;
  advice: string[];
}

interface Trend {
  change: number;
  direction: 'up' | 'down' | 'stable';
  interpretation?: string;
}

interface Trends {
  transactionVolume: Trend;
  fraudRate: Trend;
  avgAmount: Trend;
  uniqueUsers: Trend;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [loading, setLoading] = useState(true);
  const [dailyPatterns, setDailyPatterns] = useState<DailyMetrics[]>([]);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, router, selectedDays]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/daily-patterns?days=${selectedDays}`);
      if (response.ok) {
        const data = await response.json();
        setDailyPatterns(data.dailyPatterns || []);
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 dark:text-red-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (score >= 20) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getTrendIcon = (direction: string) => {
    if (direction === 'up') return <TrendingUp className="h-4 w-4" />;
    if (direction === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getTrendColor = (direction: string, isPositive: boolean = true) => {
    if (direction === 'stable') return 'text-gray-600 dark:text-gray-400';
    if (direction === 'up') return isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h1" size="3xl" weight="bold" className="mb-2">
              Daily Pattern Analytics
            </Typography>
            <Typography variant="p" color="muted">
              Analyze transaction patterns and receive AI-powered insights
            </Typography>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
            <Button onClick={fetchAnalytics} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Trends Overview */}
        {trends && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <LineChart className="h-5 w-5 text-muted-foreground" />
              <Typography variant="h3" size="lg" weight="semibold">
                Recent Trends
              </Typography>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Transaction Volume
                  </Typography>
                  <div className={getTrendColor(trends.transactionVolume.direction, true)}>
                    {getTrendIcon(trends.transactionVolume.direction)}
                  </div>
                </div>
                <Typography variant="h3" size="xl" weight="bold">
                  {trends.transactionVolume.change > 0 ? '+' : ''}{trends.transactionVolume.change}%
                </Typography>
                {trends.transactionVolume.interpretation && (
                  <Typography variant="p" size="xs" color="muted" className="mt-1">
                    {trends.transactionVolume.interpretation}
                  </Typography>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Fraud Rate
                  </Typography>
                  <div className={getTrendColor(trends.fraudRate.direction, false)}>
                    {getTrendIcon(trends.fraudRate.direction)}
                  </div>
                </div>
                <Typography variant="h3" size="xl" weight="bold">
                  {trends.fraudRate.change > 0 ? '+' : ''}{trends.fraudRate.change}%
                </Typography>
                {trends.fraudRate.interpretation && (
                  <Typography variant="p" size="xs" color="muted" className="mt-1">
                    {trends.fraudRate.interpretation}
                  </Typography>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Avg Transaction Amount
                  </Typography>
                  <div className={getTrendColor(trends.avgAmount.direction, true)}>
                    {getTrendIcon(trends.avgAmount.direction)}
                  </div>
                </div>
                <Typography variant="h3" size="xl" weight="bold">
                  {trends.avgAmount.change > 0 ? '+' : ''}{trends.avgAmount.change}%
                </Typography>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="p" size="sm" color="muted">
                    Unique Users
                  </Typography>
                  <div className={getTrendColor(trends.uniqueUsers.direction, true)}>
                    {getTrendIcon(trends.uniqueUsers.direction)}
                  </div>
                </div>
                <Typography variant="h3" size="xl" weight="bold">
                  {trends.uniqueUsers.change > 0 ? '+' : ''}{trends.uniqueUsers.change}%
                </Typography>
              </div>
            </div>
          </Card>
        )}

        {/* Daily Patterns */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <Typography variant="h3" size="lg" weight="semibold">
              Daily Analysis & Insights
            </Typography>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              Analyzing transaction patterns...
            </div>
          ) : dailyPatterns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No data available for the selected period
            </div>
          ) : (
            <div className="space-y-4">
              {dailyPatterns.map((day) => {
                const isExpanded = expandedDays.has(day.date);
                
                return (
                  <div
                    key={day.date}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* Day Summary */}
                    <div className="p-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Typography variant="h4" size="base" weight="semibold">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                            <Typography variant="p" size="sm" color="muted">
                              {day.totalTransactions.toLocaleString()} transactions
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Typography variant="p" size="xs" color="muted">
                              Risk Score
                            </Typography>
                            <div className="flex items-center gap-2">
                              <Typography
                                variant="h4"
                                size="lg"
                                weight="bold"
                                className={getRiskColor(day.riskScore)}
                              >
                                {day.riskScore}
                              </Typography>
                              <span className={cn('px-2 py-1 rounded text-xs font-medium', getRiskBadgeColor(day.riskScore))}>
                                {day.riskScore >= 70 ? 'CRITICAL' :
                                 day.riskScore >= 40 ? 'HIGH' :
                                 day.riskScore >= 20 ? 'MODERATE' : 'LOW'}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDayExpansion(day.date)}
                            className="gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Show Details
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Key Metrics Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Typography variant="p" size="xs" color="muted">
                              Fraud Rate
                            </Typography>
                            <Typography variant="p" size="sm" weight="semibold">
                              {day.fraudRate}% ({day.fraudCount})
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Typography variant="p" size="xs" color="muted">
                              Total Amount
                            </Typography>
                            <Typography variant="p" size="sm" weight="semibold">
                              ${day.totalAmount.toLocaleString()}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Typography variant="p" size="xs" color="muted">
                              Unique Users
                            </Typography>
                            <Typography variant="p" size="sm" weight="semibold">
                              {day.uniqueUsers.toLocaleString()}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Typography variant="p" size="xs" color="muted">
                              Peak Hour
                            </Typography>
                            <Typography variant="p" size="sm" weight="semibold">
                              {day.peakHour}:00
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-border">
                        {/* Suspicious Patterns */}
                        {day.suspiciousPatterns.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <Typography variant="h5" size="sm" weight="semibold">
                                Suspicious Patterns Detected
                              </Typography>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {day.suspiciousPatterns.map((pattern, idx) => (
                                <div
                                  key={idx}
                                  className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-2"
                                >
                                  <Typography variant="p" size="sm">
                                    {pattern}
                                  </Typography>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Advice */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <Typography variant="h5" size="sm" weight="semibold">
                              Recommended Actions
                            </Typography>
                          </div>
                          <div className="space-y-2">
                            {day.advice.map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-4 py-3"
                              >
                                <Typography variant="p" size="sm">
                                  {item}
                                </Typography>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Additional Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-muted/30 rounded p-3">
                            <Typography variant="p" size="xs" color="muted" className="mb-1">
                              Average Transaction Amount
                            </Typography>
                            <Typography variant="h4" size="lg" weight="bold">
                              ${day.avgAmount.toLocaleString()}
                            </Typography>
                          </div>

                          <div className="bg-muted/30 rounded p-3">
                            <Typography variant="p" size="xs" color="muted" className="mb-1">
                              Maximum Transaction
                            </Typography>
                            <Typography variant="h4" size="lg" weight="bold">
                              ${day.maxAmount.toLocaleString()}
                            </Typography>
                          </div>

                          <div className="bg-muted/30 rounded p-3">
                            <Typography variant="p" size="xs" color="muted" className="mb-1">
                              Avg Transactions per User
                            </Typography>
                            <Typography variant="h4" size="lg" weight="bold">
                              {day.avgTransactionsPerUser.toFixed(2)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
