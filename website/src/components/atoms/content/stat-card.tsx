'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
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
        'bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
            {title}
          </Typography>
          <Typography variant="h2" size="2xl" weight="bold" className="text-foreground mt-1">
            {value}
          </Typography>
        </div>
        <div
          className={cn(
            'p-3 rounded-full',
            changeType === 'positive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <Typography
          variant="span"
          size="sm"
          className={cn(
            'font-medium',
            changeType === 'positive' ? 'text-green-600' : 'text-red-600'
          )}
        >
          {change}
        </Typography>
        <Typography variant="span" size="sm" color="muted" className="text-muted-foreground ml-2">
          from last month
        </Typography>
      </div>
    </div>
  );
}

