'use client';

import { cn } from '@/src/lib';

export type TransactionStatus = 'Approved' | 'Flagged' | 'Blocked' | 'Review';

export interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    Approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Flagged: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    Review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center  px-3 py-2 rounded-md text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}

