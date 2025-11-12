'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Typography } from '@/src/components/atoms/typography';
import { cn } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FraudMetricsOverviewProps {
  data: Array<{
    hour: string;
    transactions: number;
    frauds: number;
  }>;
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
  className?: string;
}

export function FraudMetricsOverview({
  data,
  totalTransactions,
  fraudulentTransactions,
  fraudRate,
  className,
}: FraudMetricsOverviewProps) {
  // Calculate trend (comparing last 12 hours to previous 12 hours)
  const midPoint = Math.floor(data.length / 2);
  const recentHalf = data.slice(midPoint);
  const previousHalf = data.slice(0, midPoint);

  const recentTotal = recentHalf.reduce((sum, item) => sum + item.transactions, 0);
  const previousTotal = previousHalf.reduce((sum, item) => sum + item.transactions, 0);

  const transactionTrend = previousTotal > 0
    ? ((recentTotal - previousTotal) / previousTotal) * 100
    : 0;

  // Ensure trend is a valid number
  const safeTransactionTrend = isNaN(transactionTrend) ? 0 : transactionTrend;

  const recentFraud = recentHalf.reduce((sum, item) => sum + item.frauds, 0);
  const previousFraud = previousHalf.reduce((sum, item) => sum + item.frauds, 0);

  const fraudTrend = previousFraud > 0
    ? ((recentFraud - previousFraud) / previousFraud) * 100
    : 0;

  // Ensure trend is a valid number
  const safeFraudTrend = isNaN(fraudTrend) ? 0 : fraudTrend;

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-red-600';
    if (trend < -5) return 'text-green-600';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {/* Metrics Cards */}
      <div className="lg:col-span-1 space-y-4">
        {/* Total Transactions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                Total Transactions
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground mt-1">
                {isNaN(totalTransactions) ? '0' : totalTransactions.toLocaleString()}
              </Typography>
              <div className="flex items-center mt-2 space-x-1">
                {getTrendIcon(safeTransactionTrend)}
                <Typography
                  variant="span"
                  size="sm"
                  className={cn('font-medium', getTrendColor(safeTransactionTrend))}
                >
                  {safeTransactionTrend > 0 ? '+' : ''}{safeTransactionTrend.toFixed(1)}%
                </Typography>
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  vs last 12h
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Fraudulent Transactions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                Fraudulent Transactions
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground mt-1">
                {isNaN(fraudulentTransactions) ? '0' : fraudulentTransactions.toLocaleString()}
              </Typography>
              <div className="flex items-center mt-2 space-x-1">
                {getTrendIcon(safeFraudTrend)}
                <Typography
                  variant="span"
                  size="sm"
                  className={cn('font-medium', getTrendColor(safeFraudTrend))}
                >
                  {safeFraudTrend > 0 ? '+' : ''}{safeFraudTrend.toFixed(1)}%
                </Typography>
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  vs last 12h
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud Rate */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                Fraud Detection Rate
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground mt-1">
                {fraudRate.toFixed(2)}%
              </Typography>
              <div className="flex items-center mt-2">
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  Real-time monitoring active
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Volume Chart */}
      <div className="lg:col-span-2">
        <div className="bg-card border border-border rounded-lg p-6">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
            Transaction Volume (24h)
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorFrauds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="hour"
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis className="text-muted-foreground" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <Typography variant="p" size="sm" weight="semibold" className="text-foreground mb-2">
                          {label}
                        </Typography>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-primary rounded-full" />
                            <Typography variant="span" size="sm" className="text-foreground">
                              Transactions: {payload[0]?.value}
                            </Typography>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-destructive rounded-full" />
                            <Typography variant="span" size="sm" className="text-foreground">
                              Frauds: {payload[1]?.value}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorTransactions)"
              />
              <Area
                type="monotone"
                dataKey="frauds"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorFrauds)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
