'use client';

import { cn } from '@/src/lib/utils';
import { Crown, Shield, Eye, Users, User } from 'lucide-react';
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
  analyst: {
    icon: Shield,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  viewer: {
    icon: Eye,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  api_user: {
    icon: Users,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
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

