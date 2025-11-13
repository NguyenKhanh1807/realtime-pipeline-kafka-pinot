'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieLabelRenderProps,
} from 'recharts';
import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';

interface RiskFactorsChartProps {
  data: Array<{
    factor: string;
    count: number;
  }>;
  className?: string;
  height?: number;
}

// Predefined colors for risk factors - using custom dark theme palette
const RISK_FACTOR_COLORS = [
  '#d94a4a', // Critical Risk - danger-a10
  '#d7ac61', // Medium Risk - warning-a10
  '#47d5a6', // Low Risk - success-a10
  '#4077d1', // Info - info-a10
  '#e7cbe2', // Primary - primary-a0
  '#92b2e5', // Info light - info-a20
  '#9ae8ce', // Success light - success-a20
  '#ecd7b2', // Warning light - warning-a20
];

// Map risk factor names to specific colors
const getRiskFactorColor = (factor: string): string => {
  const factorLower = factor.toLowerCase();
  if (factorLower.includes('critical')) return '#d94a4a';
  if (factorLower.includes('medium')) return '#d7ac61';
  if (factorLower.includes('low')) return '#47d5a6';
  return '#4077d1';
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      factor: string;
      count: number;
    };
    value: number;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = payload.reduce((sum, item) => sum + (item.value || 0), 0);
    const percentage = total > 0 ? ((data.value || 0) / total * 100).toFixed(1) : '0';
    
    return (
      <div className="bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-4 shadow-lg">
        <Typography variant="p" size="sm" weight="semibold" className="text-foreground mb-2">
          {data.payload.factor}
        </Typography>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Count:
            </Typography>
            <Typography variant="span" size="xs" weight="semibold" className="text-foreground">
              {data.value.toLocaleString()}
            </Typography>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
            <Typography variant="span" size="xs" className="text-muted-foreground">
              Percentage:
            </Typography>
            <Typography variant="span" size="xs" weight="semibold" className="text-foreground">
              {percentage}%
            </Typography>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function RiskFactorsChart({
  data,
  className,
  height = 300
}: RiskFactorsChartProps) {
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    // Type checks for all numeric properties
    if (typeof percent === 'number' && !isNaN(percent) && percent < 0.05) return null; // Don't show labels for very small slices
    if (typeof cx !== 'number' || isNaN(cx) || typeof cy !== 'number' || isNaN(cy) ||
        typeof midAngle !== 'number' || isNaN(midAngle) ||
        typeof innerRadius !== 'number' || isNaN(innerRadius) ||
        typeof outerRadius !== 'number' || isNaN(outerRadius)) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="var(--clr-light-a0)"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight="bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(typeof percent === 'number' && !isNaN(percent) ? (percent * 100).toFixed(0) : '0')}%`}
      </text>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={90}
            innerRadius={30}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getRiskFactorColor(entry.factor) || RISK_FACTOR_COLORS[index % RISK_FACTOR_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={40}
            iconType="circle"
            wrapperStyle={{ paddingTop: '16px' }}
            formatter={(value, entry) => {
              const count = entry.payload && typeof entry.payload === 'object' && 'count' in entry.payload
                ? (entry.payload as { count: number }).count
                : 0;
              const total = data.reduce((sum, item) => sum + item.count, 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
              return (
                <span style={{ color: 'var(--clr-light-a0)', fontSize: '12px' }}>
                  {value} <span style={{ color: 'var(--clr-surface-a50)' }}>({count} - {percentage}%)</span>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
