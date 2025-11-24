'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6',
        'transition-all duration-200 ease-out',
        'hover:shadow-lg hover:shadow-black/20 hover:border-[var(--clr-info-a10)]/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <Typography 
            variant="p" 
            size="sm" 
            color="muted" 
            className="text-muted-foreground mb-2"
          >
            {title}
          </Typography>
          <Typography 
            variant="h2" 
            size="2xl" 
            weight="bold" 
            className="text-foreground leading-tight"
          >
            {value}
          </Typography>
        </div>

        {/* Icon Container */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1',
            'bg-[#21498a]/20 text-[#4077d1] border-[#4077d1]/30',
            'transition-all duration-200',
            'group-hover:bg-[#21498a]/30 group-hover:border-[#4077d1]/50 group-hover:shadow-md'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Change indicator (if provided) */}
      {change && changeType && (
        <div className="mt-4 pt-4 border-t-2 border-border flex items-center">
          <Typography
            variant="span"
            size="sm"
            className={cn(
              'font-semibold',
              changeType === 'positive' 
                ? 'text-[#47d5a6]' 
                : 'text-[#d94a4a]'
            )}
          >
            {change}
          </Typography>
          <Typography 
            variant="span" 
            size="sm" 
            color="muted" 
            className="text-muted-foreground ml-2"
          >
            from last month
          </Typography>
        </div>
      )}
    </div>
  );
}

