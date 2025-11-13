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
              {data.transactions.toLocaleString()}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Fraudulent:
            </Typography>
            <Typography variant="span" size="xs" weight="semibold" className="text-[#d94a4a]">
              {data.frauds.toLocaleString()}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Legitimate:
            </Typography>
            <Typography variant="span" size="xs" weight="semibold" className="text-[#47d5a6]">
              {data.legitimate.toLocaleString()}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Fraud Rate:
            </Typography>
            <Typography variant="span" size="xs" weight="semibold" className="text-[#d7ac61]">
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-surface-a20)" opacity={0.5} />
            <XAxis
              dataKey="hourLabel"
              stroke="var(--clr-surface-a50)"
              tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--clr-surface-a20)' }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--clr-surface-a50)"
              tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--clr-surface-a20)' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--clr-surface-a50)"
              tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--clr-surface-a20)' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="transactions"
              name="Total Transactions"
              fill="#4077d1"
              opacity={0.2}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="frauds"
              name="Fraudulent"
              fill="#d94a4a"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="fraudRate"
              name="Fraud Rate (%)"
              stroke="#d7ac61"
              strokeWidth={2.5}
              dot={{ r: 5, fill: '#d7ac61', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-surface-a20)" opacity={0.5} />
          <XAxis
            dataKey="hourLabel"
            stroke="var(--clr-surface-a50)"
            tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
            tickLine={{ stroke: 'var(--clr-surface-a20)' }}
          />
          <YAxis
            stroke="var(--clr-surface-a50)"
            tick={{ fill: 'var(--clr-surface-a50)', fontSize: 11 }}
            tickLine={{ stroke: 'var(--clr-surface-a20)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="transactions"
            name="Total Transactions"
            stroke="#4077d1"
            strokeWidth={2.5}
            dot={{ r: 5, fill: '#4077d1', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="frauds"
            name="Fraudulent Transactions"
            stroke="#d94a4a"
            strokeWidth={2.5}
            dot={{ r: 5, fill: '#d94a4a', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
