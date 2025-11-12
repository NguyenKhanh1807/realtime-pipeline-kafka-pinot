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
import { Typography } from '@/src/components/atoms/typography';
import { cn } from '@/src/lib/utils';

interface RiskFactorsChartProps {
  data: Array<{
    factor: string;
    count: number;
  }>;
  className?: string;
  height?: number;
}

// Predefined colors for risk factors
const RISK_FACTOR_COLORS = [
  '#ef4444', // red-500 - High risk
  '#f97316', // orange-500 - Medium-high risk
  '#eab308', // yellow-500 - Medium risk
  '#22c55e', // green-500 - Low risk
  '#3b82f6', // blue-500 - Info
  '#8b5cf6', // violet-500 - Other
  '#ec4899', // pink-500 - Additional
  '#06b6d4', // cyan-500 - Additional
];

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
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <Typography variant="p" size="sm" weight="semibold" className="text-foreground mb-1">
          {data.payload.factor}
        </Typography>
        <Typography variant="span" size="sm" className="text-muted-foreground">
          Count: {data.value}
        </Typography>
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
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
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
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={RISK_FACTOR_COLORS[index % RISK_FACTOR_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const count = entry.payload && typeof entry.payload === 'object' && 'count' in entry.payload
                ? (entry.payload as { count: number }).count
                : 0;
              return (
                <span style={{ color: entry.color }}>
                  {value} ({count})
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
