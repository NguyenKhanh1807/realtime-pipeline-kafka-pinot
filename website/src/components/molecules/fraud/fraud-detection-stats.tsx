'use client';

import { Typography } from '@/src/components/atoms';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib';

export interface FraudDetectionStatProps {
  value: string;
  label: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export interface FraudDetectionStatsProps {
  stats: FraudDetectionStatProps[];
  className?: string;
}

export function FraudDetectionStats({ stats, className }: FraudDetectionStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6', className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  'p-2 rounded-lg',
                  stat.iconBgColor || 'bg-muted',
                  stat.iconColor || 'text-muted-foreground'
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  {stat.value}
                </Typography>
                <Typography variant="p" size="xs" color="muted" className="text-muted-foreground mb-1">
                  {stat.label}
                </Typography>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

