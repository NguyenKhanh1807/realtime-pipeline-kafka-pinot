'use client';

import { cn } from '@/src/lib/utils';
import { Crown, User } from 'lucide-react';
import type { UserRole } from '@/src/types';

export interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  className?: string;
}

const roleConfig = {
  admin: {
    icon: Crown,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  user: {
    icon: User,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

export function RoleBadge({ role, showIcon = true, className }: RoleBadgeProps) {
  const config = roleConfig[role] || {
    icon: User,
    bgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
  };

  const Icon = config.icon;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {showIcon && (
        <div className={cn('p-1.5 rounded-md', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.iconColor)} />
        </div>
      )}
    </div>
  );
}

