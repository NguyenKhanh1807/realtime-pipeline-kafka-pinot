'use client';

import { Typography, StatusBadge, RiskScoreBadge } from '@/src/components/atoms';
import type { TransactionStatus } from '@/src/components/atoms/badges/status-badge';
import { cn } from '@/src/lib';
import { CreditCard, MapPin } from 'lucide-react';

export interface TransactionHistoryRowProps {
  id: string;
  cardNumber: string;
  amount: number;
  merchant: string;
  score: number;
  status: TransactionStatus;
  timestamp: string;
  location?: string;
  customerName?: string;
  customerEmail?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export function TransactionHistoryRow({
  id,
  cardNumber,
  amount,
  merchant,
  score,
  status,
  timestamp,
  location,
  className,
}: TransactionHistoryRowProps) {
  return (
    <tr className={cn(
      'transition-colors hover:bg-muted/30 group',
      className
    )}>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            {timestamp}
          </Typography>
          <Typography variant="span" size="xs" className="text-muted-foreground font-mono">
            {id}
          </Typography>
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <Typography variant="span" size="sm" weight="semibold" className="text-foreground">
            ${amount.toFixed(2)}
          </Typography>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            <span className="font-mono">{cardNumber}</span>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <Typography variant="span" size="sm" className="text-foreground">
            {merchant}
          </Typography>
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </td>
      <td className="p-4 w-40">
        <RiskScoreBadge score={score} status={status} />
      </td>
      <td className="p-4 w-40">
        <StatusBadge status={status} />
      </td>
    </tr>
  );
}
