'use client';

import { Typography, AnalysisItem, AnalysisItemProps } from '@/src/components/atoms';

export interface FraudRiskAnalysisProps {
  items: AnalysisItemProps[];
  className?: string;
}

export function FraudRiskAnalysis({ items, className }: FraudRiskAnalysisProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${className || ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Fraud Risk Analysis
          </Typography>
          <Typography variant="p" size="xs" color="muted" className="text-muted-foreground mt-0.5">
            Distribution of transactions by risk level and severity
          </Typography>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <AnalysisItem key={index} {...item} />
        ))}
      </div>
    </div>
  );
}