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

// Helper function to get icon theme colors based on label or index
const getIconTheme = (label: string, index: number) => {
  const labelLower = label.toLowerCase();

  // Detection Accuracy - Success/Green theme
  if (labelLower.includes('accuracy') || labelLower.includes('detection')) {
    return {
      bg: 'bg-[#1a4d3a]/20',
      text: 'text-[#47d5a6]',
      border: 'border-[#47d5a6]/30',
      hoverBg: 'group-hover:bg-[#1a4d3a]/30',
      hoverBorder: 'group-hover:border-[#47d5a6]/50',
      cardHoverBorder: 'hover:border-[#47d5a6]/30',
    };
  }

  // Flagged/Alert - Danger/Red theme
  if (labelLower.includes('flagged') || labelLower.includes('alert') || labelLower.includes('warning')) {
    return {
      bg: 'bg-[#7a2d2d]/20',
      text: 'text-[#d94a4a]',
      border: 'border-[#d94a4a]/30',
      hoverBg: 'group-hover:bg-[#7a2d2d]/30',
      hoverBorder: 'group-hover:border-[#d94a4a]/50',
      cardHoverBorder: 'hover:border-[#d94a4a]/30',
    };
  }

  // Default to info/blue theme for Transactions and others
  return {
    bg: 'bg-[#21498a]/20',
    text: 'text-[#4077d1]',
    border: 'border-[#4077d1]/30',
    hoverBg: 'group-hover:bg-[#21498a]/30',
    hoverBorder: 'group-hover:border-[#4077d1]/50',
    cardHoverBorder: 'hover:border-[#4077d1]/30',
  };
};

export function FraudDetectionStats({ stats, className }: FraudDetectionStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6', className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const theme = getIconTheme(stat.label, index);

        return (
          <div
            key={index}
            className={cn(
              'group relative bg-[var(--clr-surface-a10)] border-2 border-border rounded-lg p-6',
              'transition-all duration-200 ease-out',
              'hover:shadow-lg hover:shadow-black/20',
              theme.cardHoverBorder
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
                  {stat.label}
                </Typography>
                <Typography
                  variant="h2"
                  size="2xl"
                  weight="bold"
                  className="text-foreground leading-tight"
                >
                  {stat.value}
                </Typography>
              </div>

              {/* Icon Container */}
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 mt-1',
                  theme.bg,
                  theme.text,
                  theme.border,
                  'transition-all duration-200',
                  theme.hoverBg,
                  theme.hoverBorder,
                  'group-hover:shadow-md'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

