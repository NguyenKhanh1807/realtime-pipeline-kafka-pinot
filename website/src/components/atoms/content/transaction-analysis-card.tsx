'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { LucideIcon } from 'lucide-react';

export interface TransactionAnalysisCardProps {
  label: string;
  count: number;
  amount: string;
  percentage: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

export function TransactionAnalysisCard({
  label,
  count,
  amount,
  percentage,
  icon: Icon,
  iconColor = 'text-[#4077d1]',
  iconBgColor = 'bg-[#21498a]/20',
  className,
}: TransactionAnalysisCardProps) {
  return (
    <div
      className={cn(
        'group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6',
        'transition-all duration-200 ease-out',
        'hover:shadow-lg hover:shadow-black/20 hover:border-[var(--clr-info-a10)]/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        {/* Icon Container */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1',
            iconBgColor,
            iconColor,
            'border-[var(--clr-info-a10)]/30',
            'transition-all duration-200',
            'group-hover:shadow-md group-hover:border-[var(--clr-info-a10)]/50'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Count */}
        <div className="text-right">
          <Typography 
            variant="h2" 
            size="2xl" 
            weight="bold" 
            className="text-foreground leading-tight"
          >
            {count.toLocaleString()}
          </Typography>
          <Typography 
            variant="p" 
            size="xs" 
            color="muted" 
            className="text-muted-foreground mt-0.5"
          >
            transactions
          </Typography>
        </div>
      </div>

      {/* Label */}
      <Typography 
        variant="p" 
        size="sm" 
        weight="semibold"
        className="text-foreground mb-3"
      >
        {label}
      </Typography>

      {/* Amount and Percentage */}
      <div className="pt-3 border-t-2 border-border flex items-center justify-between">
        <Typography 
          variant="span" 
          size="sm" 
          weight="semibold"
          className="text-foreground"
        >
          {amount}
        </Typography>
        <Typography 
          variant="span" 
          size="sm" 
          color="muted" 
          className="text-muted-foreground"
        >
          {percentage}%
        </Typography>
      </div>
    </div>
  );
}

