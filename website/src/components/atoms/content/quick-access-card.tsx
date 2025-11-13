'use client';

import { Typography } from '@/src/components/atoms';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib';

export interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    iconBg: 'bg-[#21498a]/20',
    iconColor: 'text-[#4077d1]',
    borderColor: 'border-[#4077d1]/30',
    hoverBg: 'hover:bg-[#21498a]/30',
    hoverBorder: 'hover:border-[#4077d1]/50',
    accent: 'text-[#4077d1]',
  },
  green: {
    iconBg: 'bg-[#22946e]/20',
    iconColor: 'text-[#47d5a6]',
    borderColor: 'border-[#47d5a6]/30',
    hoverBg: 'hover:bg-[#22946e]/30',
    hoverBorder: 'hover:border-[#47d5a6]/50',
    accent: 'text-[#47d5a6]',
  },
  purple: {
    iconBg: 'bg-[#e7cbe2]/20',
    iconColor: 'text-[#e7cbe2]',
    borderColor: 'border-[#e7cbe2]/30',
    hoverBg: 'hover:bg-[#e7cbe2]/30',
    hoverBorder: 'hover:border-[#e7cbe2]/50',
    accent: 'text-[#e7cbe2]',
  },
  orange: {
    iconBg: 'bg-[#a87a2a]/20',
    iconColor: 'text-[#d7ac61]',
    borderColor: 'border-[#d7ac61]/30',
    hoverBg: 'hover:bg-[#a87a2a]/30',
    hoverBorder: 'hover:border-[#d7ac61]/50',
    accent: 'text-[#d7ac61]',
  },
};

export function QuickAccessCard({
  title,
  description,
  icon: Icon,
  color = 'blue',
  onClick,
  className,
}: QuickAccessCardProps) {
  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-lg border-2 bg-[var(--clr-surface-a10)] p-5 text-left',
        'transition-all duration-200 ease-out',
        'hover:shadow-lg hover:shadow-black/20',
        colors.borderColor,
        colors.hoverBorder,
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon Container */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200',
            colors.iconBg,
            colors.borderColor,
            'group-hover:shadow-md',
            colors.hoverBorder
          )}
        >
          <Icon className={cn('h-5 w-5', colors.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Typography
            variant="h3"
            size="sm"
            weight="semibold"
            className={cn(
              'mb-1.5 text-foreground transition-colors duration-200',
              {
                'group-hover:text-[#4077d1]': color === 'blue',
                'group-hover:text-[#47d5a6]': color === 'green',
                'group-hover:text-[#e7cbe2]': color === 'purple',
                'group-hover:text-[#d7ac61]': color === 'orange',
              }
            )}
          >
            {title}
          </Typography>
          <Typography
            variant="p"
            size="xs"
            className="text-muted-foreground leading-relaxed"
          >
            {description}
          </Typography>
        </div>
      </div>

      {/* Subtle accent line on hover */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300',
          colors.iconBg,
          'group-hover:w-full'
        )}
      />
    </button>
  );
}

