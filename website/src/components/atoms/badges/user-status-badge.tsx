'use client';

import { cn } from '@/src/lib';

export interface UserStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function UserStatusBadge({ isActive, className }: UserStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold',
        isActive
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
        className
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

