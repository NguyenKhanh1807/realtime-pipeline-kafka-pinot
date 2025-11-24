'use client';

import { Typography, TransactionAnalysisCard, TransactionAnalysisCardProps } from '@/src/components/atoms';

export interface TransactionAnalysisProps {
  items: TransactionAnalysisCardProps[];
  className?: string;
}

export function TransactionAnalysis({ items, className }: TransactionAnalysisProps) {
  return (
    <div className={className || ''}>
      <div className="mb-6">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-1">
          Transaction Analysis
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Detailed breakdown of transaction types and payment methods
        </Typography>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item, index) => (
          <TransactionAnalysisCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
}

