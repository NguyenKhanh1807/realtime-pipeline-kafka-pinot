'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { LucideIcon } from 'lucide-react';

export interface FraudRiskCardProps {
  label: string;
  count: number;
  percentage: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  borderColor?: string;
  className?: string;
}

const riskLevelColors = {
  low: {
    iconColor: 'text-[#47d5a6]',
    iconBgColor: 'bg-[#22946e]/20',
    borderColor: 'border-[#47d5a6]/30',
    hoverBorder: 'hover:border-[#47d5a6]/50',
  },
  medium: {
    iconColor: 'text-[#d7ac61]',
    iconBgColor: 'bg-[#a87a2a]/20',
    borderColor: 'border-[#d7ac61]/30',
    hoverBorder: 'hover:border-[#d7ac61]/50',
  },
  high: {
    iconColor: 'text-[#d94a4a]',
    iconBgColor: 'bg-[#9c2121]/20',
    borderColor: 'border-[#d94a4a]/30',
    hoverBorder: 'hover:border-[#d94a4a]/50',
  },
  critical: {
    iconColor: 'text-[#d94a4a]',
    iconBgColor: 'bg-[#9c2121]/30',
    borderColor: 'border-[#d94a4a]/50',
    hoverBorder: 'hover:border-[#d94a4a]/70',
  },
};

export function FraudRiskCard({
  label,
  count,
  percentage,
  icon: Icon,
  iconColor,
  iconBgColor,
  borderColor,
  className,
}: FraudRiskCardProps) {
  // Determine risk level from label
  const riskLevel = label.toLowerCase().includes('critical')
    ? 'critical'
    : label.toLowerCase().includes('medium')
    ? 'medium'
    : 'low';

  const colors = riskLevelColors[riskLevel];
  const finalIconColor = iconColor || colors.iconColor;
  const finalIconBgColor = iconBgColor || colors.iconBgColor;
  const finalBorderColor = borderColor || colors.borderColor;

  return (
    <div
      className={cn(
        'group relative bg-[var(--clr-surface-a10)] border-2 rounded-lg p-3',
        finalBorderColor,
        'transition-all duration-200 ease-out',
        'hover:shadow-lg hover:shadow-black/20',
        colors.hoverBorder,
        className
      )}
    >
      {/* Icon and Label Row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Icon Container */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2',
            finalIconBgColor,
            finalIconColor,
            finalBorderColor,
            'transition-all duration-200',
            'group-hover:shadow-md',
            colors.hoverBorder
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        {/* Label */}
        <Typography 
          variant="p" 
          size="sm" 
          weight="semibold"
          className="text-foreground"
        >
          {label}
        </Typography>
      </div>

      {/* Count and Percentage Row */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div>
          <Typography 
            variant="h2" 
            size="lg" 
            weight="bold" 
            className="text-foreground leading-tight"
          >
            {count.toLocaleString()}
          </Typography>
          <Typography 
            variant="p" 
            size="xs" 
            color="muted" 
            className="text-muted-foreground"
          >
            transactions
          </Typography>
        </div>

        <div className="text-right">
          <Typography 
            variant="span" 
            size="sm" 
            weight="semibold"
            className={cn(
              'text-foreground',
              riskLevel === 'critical'
                ? 'text-[#d94a4a]' 
                : riskLevel === 'medium'
                ? 'text-[#d7ac61]'
                : 'text-[#47d5a6]'
            )}
          >
            {percentage.toFixed(1)}%
          </Typography>
          <Typography 
            variant="span" 
            size="sm" 
            color="muted" 
            className="text-muted-foreground ml-2"
          >
            of total
          </Typography>
        </div>
      </div>
    </div>
  );
}

