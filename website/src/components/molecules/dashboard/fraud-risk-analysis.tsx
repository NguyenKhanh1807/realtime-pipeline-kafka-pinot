'use client';

import { Typography, FraudRiskCard, FraudRiskCardProps } from '@/src/components/atoms';

export interface FraudRiskAnalysisProps {
  items: FraudRiskCardProps[];
  className?: string;
}

export function FraudRiskAnalysis({ items, className }: FraudRiskAnalysisProps) {
  return (
    <div className={className || ''}>
      <div className="mb-6">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-1">
          Fraud Risk Analysis
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Distribution of transactions by risk level and severity
        </Typography>
      </div>
      <div className="flex flex-col gap-6">
        {items.map((item, index) => (
          <FraudRiskCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
}