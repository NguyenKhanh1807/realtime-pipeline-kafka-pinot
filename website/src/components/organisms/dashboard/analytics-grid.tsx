'use client';

import { Typography } from '@/src/components/atoms';
import { FraudTrendsChart } from './fraud-trends-chart';
import { RiskFactorsChart } from './risk-factors-chart';

export interface AnalyticsGridProps {
  trendsData: Array<{ hour: string; transactions: number; frauds: number }>;
  riskFactorsData: Array<{ factor: string; count: number }>;
  className?: string;
  isRefreshing?: boolean;
}

export function AnalyticsGrid({ trendsData, riskFactorsData, className, isRefreshing = false }: AnalyticsGridProps) {
  return (
    <div className={`grid grid-cols-1 xl:grid-cols-3 gap-8 ${className || ''}`}>
      {/* Transaction Trends */}
      <div className="xl:col-span-2 bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
              Transaction Trends (12h)
            </Typography>
            {isRefreshing && (
              <div className="h-2 w-2 rounded-full bg-[#47d5a6] animate-pulse" title="Refreshing..." />
            )}
          </div>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
            Real-time transaction volume and fraud detection patterns over the last 12 hours • Auto-refreshing every 3s
          </Typography>
        </div>
        <FraudTrendsChart data={trendsData} height={300} showCombined={true} />
      </div>

      {/* Risk Factor Distribution */}
      <div className="bg-card border border-border rounded-lg p-6">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
          Risk Factor Distribution
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-6">
          Breakdown of fraud detection triggers by category and frequency
        </Typography>
        <RiskFactorsChart data={riskFactorsData} height={300} />
      </div>
    </div>
  );
}

