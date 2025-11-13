'use client';

import { cn } from '@/src/lib';

export type TransactionStatus = 'Approved' | 'Flagged' | 'Blocked' | 'Review';

export interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    Approved: 'bg-[#22946e]/20 text-[#47d5a6] border border-[#47d5a6]/30',
    Flagged: 'bg-[#a87a2a]/20 text-[#d7ac61] border border-[#d7ac61]/30',
    Blocked: 'bg-[#9c2121]/20 text-[#d94a4a] border border-[#d94a4a]/30',
    Review: 'bg-[#a87a2a]/20 text-[#d7ac61] border border-[#d7ac61]/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium w-20',
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}

