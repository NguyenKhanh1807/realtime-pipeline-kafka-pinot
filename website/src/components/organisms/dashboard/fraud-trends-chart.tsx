'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';
import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';

interface FraudTrendsChartProps {
  data: Array<{
    hour: string;
    transactions: number;
    frauds: number;
  }>;
  className?: string;
  height?: number;
  showCombined?: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      hourLabel: string;
      transactions: number;
      frauds: number;
      legitimate: number;
      fraudRate: number;
    };
    value: number;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <Typography variant="p" size="sm" weight="semibold" className="text-foreground mb-2">
          {label}
        </Typography>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Total Transactions:
            </Typography>
            <Typography variant="span" size="xs" weight="medium" className="text-foreground">
              {data.transactions}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Fraudulent:
            </Typography>
            <Typography variant="span" size="xs" weight="medium" className="text-red-600">
              {data.frauds}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Legitimate:
            </Typography>
            <Typography variant="span" size="xs" weight="medium" className="text-green-600">
              {data.legitimate}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Fraud Rate:
            </Typography>
            <Typography variant="span" size="xs" weight="medium" className="text-orange-600">
              {!isNaN(data.fraudRate) ? data.fraudRate.toFixed(1) : '0.0'}%
            </Typography>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function FraudTrendsChart({
  data,
  className,
  height = 300,
  showCombined = false
}: FraudTrendsChartProps) {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      hourLabel: item.hour,
      legitimate: item.transactions - item.frauds,
      fraudRate: item.transactions > 0 ? (item.frauds / item.transactions) * 100 : 0,
    }));
  }, [data]);


  if (showCombined) {
    return (
      <div className={cn('w-full', className)}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="hourLabel"
              className="text-muted-foreground"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              className="text-muted-foreground"
              fontSize={12}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-muted-foreground"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="transactions"
              name="Total Transactions"
              fill="hsl(var(--primary))"
              opacity={0.3}
            />
            <Bar
              yAxisId="left"
              dataKey="frauds"
              name="Fraudulent"
              fill="hsl(var(--destructive))"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="fraudRate"
              name="Fraud Rate (%)"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="hourLabel"
            className="text-muted-foreground"
            fontSize={12}
          />
          <YAxis className="text-muted-foreground" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="transactions"
            name="Total Transactions"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="frauds"
            name="Fraudulent Transactions"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
