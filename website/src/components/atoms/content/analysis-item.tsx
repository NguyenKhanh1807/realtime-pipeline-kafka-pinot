'use client';

import { Typography } from '@/src/components/atoms';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib';

export interface AnalysisItemProps {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  className?: string;
}

export function AnalysisItem({
  label,
  value,
  description,
  icon: Icon,
  iconBgColor = 'bg-muted',
  iconColor = 'text-muted-foreground',
  valueColor = 'text-foreground',
  className,
}: AnalysisItemProps) {
  return (
    <div className={cn('flex items-center justify-between p-4 bg-gradient-to-r from-muted/60 to-muted/40 rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200 group', className)}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200', iconBgColor)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="p" size="sm" weight="semibold" className="text-foreground group-hover:text-primary transition-colors">
            {label}
          </Typography>
          {description && (
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
              {description}
            </Typography>
          )}
        </div>
      </div>
      <Typography variant="h4" size="lg" weight="bold" className={cn('shrink-0 ml-4', valueColor)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
    </div>
  );
}

