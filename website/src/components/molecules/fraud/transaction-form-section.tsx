'use client';

import { Typography } from '@/src/components/atoms';
import { TransactionForm, type TransactionData } from '@/src/components/organisms';
import { cn } from '@/src/lib';

export interface TransactionFormSectionProps {
  onSubmit: (data: TransactionData) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function TransactionFormSection({
  onSubmit,
  isLoading = false,
  title = 'Transaction Analysis',
  description = 'Enter transaction details to check for fraudulent activity using real-time analytics',
  className,
}: TransactionFormSectionProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
      <div className="mb-6">
        <Typography variant="h2" size="xl" weight="semibold" className="text-foreground mb-2">
          {title}
        </Typography>
        <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
          {description}
        </Typography>
      </div>

      <TransactionForm onSubmit={onSubmit} isLoading={isLoading} />
    </div>
  );
}

