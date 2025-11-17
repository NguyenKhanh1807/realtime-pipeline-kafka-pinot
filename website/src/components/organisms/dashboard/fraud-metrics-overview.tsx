'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { TrendingUp, TrendingDown, Minus, CreditCard, AlertTriangle, Shield } from 'lucide-react';

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
  isRefreshing?: boolean;
}

export function FraudMetricsOverview({
  data,
  totalTransactions,
  fraudulentTransactions,
  fraudRate,
  className,
  isRefreshing = false,
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
    if (trend > 5) return <TrendingUp className="h-3.5 w-3.5 text-[#d94a4a]" />;
    if (trend < -5) return <TrendingDown className="h-3.5 w-3.5 text-[#47d5a6]" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-[#d94a4a]';
    if (trend < -5) return 'text-[#47d5a6]';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch', className)}>
      {/* Metrics Cards */}
      <div className="lg:col-span-1 flex flex-col gap-4 h-full">
        {/* Total Transactions */}
        <div className="group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6 flex-1 flex flex-col justify-center transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/20 hover:border-[#4077d1]/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-2">
                Total Transactions
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground leading-tight">
                {isNaN(totalTransactions) ? '0' : totalTransactions.toLocaleString()}
              </Typography>
              <div className="flex items-center mt-3 space-x-1.5">
                {getTrendIcon(safeTransactionTrend)}
                <Typography
                  variant="span"
                  size="sm"
                  className={cn('font-semibold', getTrendColor(safeTransactionTrend))}
                >
                  {safeTransactionTrend > 0 ? '+' : ''}{safeTransactionTrend.toFixed(1)}%
                </Typography>
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  vs last 12h
                </Typography>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1 bg-[#21498a]/20 text-[#4077d1] border-[#4077d1]/30 transition-all duration-200 group-hover:bg-[#21498a]/30 group-hover:border-[#4077d1]/50 group-hover:shadow-md">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Fraudulent Transactions */}
        <div className="group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6 flex-1 flex flex-col justify-center transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/20 hover:border-[#d94a4a]/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-2">
                Fraudulent Transactions
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground leading-tight">
                {isNaN(fraudulentTransactions) ? '0' : fraudulentTransactions.toLocaleString()}
              </Typography>
              <div className="flex items-center mt-3 space-x-1.5">
                {getTrendIcon(safeFraudTrend)}
                <Typography
                  variant="span"
                  size="sm"
                  className={cn('font-semibold', getTrendColor(safeFraudTrend))}
                >
                  {safeFraudTrend > 0 ? '+' : ''}{safeFraudTrend.toFixed(1)}%
                </Typography>
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  vs last 12h
                </Typography>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1 bg-[#7a2d2d]/20 text-[#d94a4a] border-[#d94a4a]/30 transition-all duration-200 group-hover:bg-[#7a2d2d]/30 group-hover:border-[#d94a4a]/50 group-hover:shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Fraud Rate */}
        <div className="group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6 flex-1 flex flex-col justify-center transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/20 hover:border-[#d7ac61]/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-2">
                Fraud Detection Rate
              </Typography>
              <Typography variant="h2" size="2xl" weight="bold" className="text-foreground leading-tight">
                {fraudRate.toFixed(2)}%
              </Typography>
              <div className="flex items-center mt-3">
                <div className="flex items-center space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#47d5a6] animate-pulse" />
                  <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                    Real-time monitoring active
                  </Typography>
                </div>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1 bg-[#5a4a2d]/20 text-[#d7ac61] border-[#d7ac61]/30 transition-all duration-200 group-hover:bg-[#5a4a2d]/30 group-hover:border-[#d7ac61]/50 group-hover:shadow-md">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Volume Chart */}
      <div className="lg:col-span-2 flex h-full">
        <div className="bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6 flex flex-col w-full justify-center">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                Transaction Volume (12h)
              </Typography>
              {isRefreshing && (
                <div className="h-2 w-2 rounded-full bg-[#47d5a6] animate-pulse" title="Refreshing..." />
              )}
            </div>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              Hourly transaction volume and fraud detection trends over the last 12 hours • Auto-refreshing every 3s
            </Typography>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={data.length > 0 ? data : []}
                margin={{ top: 20, right: 10, left: 0, bottom: 12 }}
              >
                <defs>
                  <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4077d1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4077d1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorFrauds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d94a4a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d94a4a" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-surface-a20)" opacity={0.5} />
                <XAxis
                  dataKey="hour"
                  stroke="var(--clr-surface-a50)"
                  tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
                  tickLine={{ stroke: 'var(--clr-surface-a20)' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="var(--clr-surface-a50)"
                  tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
                  tickLine={{ stroke: 'var(--clr-surface-a20)' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const transactionsValue = payload[0]?.value || 0;
                      const fraudsValue = payload[1]?.value || 0;
                      const legitimateValue = transactionsValue - fraudsValue;
                      const fraudRate = transactionsValue > 0 ? ((fraudsValue / transactionsValue) * 100).toFixed(1) : '0.0';

                      return (
                        <div className="bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-4 shadow-lg">
                          <Typography variant="p" size="sm" weight="semibold" className="text-foreground mb-3">
                            {label}
                          </Typography>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <Typography variant="span" size="xs" className="text-muted-foreground">
                                Total Transactions:
                              </Typography>
                              <Typography variant="span" size="xs" weight="semibold" className="text-foreground">
                                {typeof transactionsValue === 'number' ? transactionsValue.toLocaleString() : transactionsValue}
                              </Typography>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <Typography variant="span" size="xs" className="text-muted-foreground">
                                Fraudulent:
                              </Typography>
                              <Typography variant="span" size="xs" weight="semibold" className="text-[#d94a4a]">
                                {typeof fraudsValue === 'number' ? fraudsValue.toLocaleString() : fraudsValue}
                              </Typography>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <Typography variant="span" size="xs" className="text-muted-foreground">
                                Legitimate:
                              </Typography>
                              <Typography variant="span" size="xs" weight="semibold" className="text-[#47d5a6]">
                                {typeof legitimateValue === 'number' ? legitimateValue.toLocaleString() : legitimateValue}
                              </Typography>
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                              <Typography variant="span" size="xs" className="text-muted-foreground">
                                Fraud Rate:
                              </Typography>
                              <Typography variant="span" size="xs" weight="semibold" className="text-[#d7ac61]">
                                {fraudRate}%
                              </Typography>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="square"
                  wrapperStyle={{ paddingBottom: '8px' }}
                  formatter={(value, entry) => {
                    return (
                      <span style={{ color: 'var(--clr-light-a0)', fontSize: '12px' }}>
                        {value}
                      </span>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  name="Total Transactions"
                  stroke="#4077d1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTransactions)"
                />
                <Area
                  type="monotone"
                  dataKey="frauds"
                  name="Fraudulent Transactions"
                  stroke="#d94a4a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFrauds)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
