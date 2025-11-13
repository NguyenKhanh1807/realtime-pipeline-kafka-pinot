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
    hoverShadow: 'hover:shadow-blue-500/10',
    hoverBorder: 'hover:border-blue-500/50',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconBgHover: 'group-hover:bg-blue-200 dark:group-hover:bg-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    gradient: 'from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10',
  },
  green: {
    hoverShadow: 'hover:shadow-green-500/10',
    hoverBorder: 'hover:border-green-500/50',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconBgHover: 'group-hover:bg-green-200 dark:group-hover:bg-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    textHover: 'group-hover:text-green-600 dark:group-hover:text-green-400',
    gradient: 'from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/10',
  },
  purple: {
    hoverShadow: 'hover:shadow-purple-500/10',
    hoverBorder: 'hover:border-purple-500/50',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconBgHover: 'group-hover:bg-purple-200 dark:group-hover:bg-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    textHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
    gradient: 'from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10',
  },
  orange: {
    hoverShadow: 'hover:shadow-orange-500/10',
    hoverBorder: 'hover:border-orange-500/50',
    iconBg: 'bg-orange-100 dark:bg-orange-900',
    iconBgHover: 'group-hover:bg-orange-200 dark:group-hover:bg-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400',
    textHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
    gradient: 'from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-orange-500/10',
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
        'bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all hover:-translate-y-1 text-left group relative overflow-hidden',
        colors.hoverShadow,
        colors.hoverBorder,
        className
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br transition-all duration-300', colors.gradient)} />
      <div className="relative">
        <div className="flex items-center space-x-2.5 mb-2">
          <div
            className={cn(
              'p-1.5 rounded-lg group-hover:scale-110 transition-all duration-300',
              colors.iconBg,
              colors.iconBgHover
            )}
          >
            <Icon className={cn('h-4 w-4', colors.iconColor)} />
          </div>
          <Typography
            variant="h3"
            size="sm"
            weight="semibold"
            className={cn('text-foreground transition-colors', colors.textHover)}
          >
            {title}
          </Typography>
        </div>
        <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
          {description}
        </Typography>
      </div>
    </button>
  );
}

