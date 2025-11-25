'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { cn } from '@/src/lib/utils';

interface RealtimeFraudChartProps {
  data: Array<{
    hour: string;
    transactions: number;
    frauds: number;
  }>;
  producerActive: boolean;
  className?: string;
}

export function RealtimeFraudChart({ data, producerActive, className }: RealtimeFraudChartProps) {
  const [timeFrame, setTimeFrame] = useState<'6h' | '12h' | '24h'>('24h');

  const getFilteredData = () => {
    if (timeFrame === '6h') {
      return data.slice(-6);
    } else if (timeFrame === '12h') {
      return data.slice(-12);
    }
    return data;
  };

  const filteredData = getFilteredData();

  return (
    <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Real-time Transaction Flow
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
            {producerActive ? 'Live data streaming' : 'Showing last known data'}
          </Typography>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={timeFrame === '6h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFrame('6h')}
          >
            6h
          </Button>
          <Button
            variant={timeFrame === '12h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFrame('12h')}
          >
            12h
          </Button>
          <Button
            variant={timeFrame === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFrame('24h')}
          >
            24h
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="hour"
            className="text-muted-foreground"
            style={{ fontSize: '12px' }}
          />
          <YAxis className="text-muted-foreground" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="frauds"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            name="Fraudulent Transactions"
            dot={{ fill: 'hsl(var(--destructive))' }}
          />
          <Line
            type="monotone"
            dataKey="transactions"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            name="Total Transactions"
            dot={{ fill: 'hsl(var(--chart-1))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}