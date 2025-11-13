'use client';

import { Typography, StatusBadge, type TransactionStatus } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { Clock, DollarSign, CreditCard, Store, AlertTriangle, MapPin, User, Mail } from 'lucide-react';

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
  customerName,
  customerEmail,
  riskLevel,
  className,
}: TransactionHistoryRowProps) {
  const getScoreColor = (score: number) => {
    if (score < 30) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' };
    if (score < 70) return { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' };
  };

  const scoreColors = getScoreColor(score);

  return (
    <tr className={cn(
      'transition-colors duration-150 hover:bg-muted/50 group',
      className
    )}>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Typography variant="span" size="sm" className="text-foreground font-medium mb-0">
              {timestamp}
            </Typography>
          </div>
          <Typography variant="span" size="xs" className="text-muted-foreground font-mono">
            {id}
          </Typography>
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Typography variant="span" size="sm" weight="semibold" className="text-foreground">
              ${amount.toFixed(2)}
            </Typography>
          </div>
          <div className="flex items-center gap-1.5 ml-6">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            <Typography variant="span" size="xs" className="text-muted-foreground font-mono">
              {cardNumber}
            </Typography>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Typography variant="span" size="sm" className="text-foreground">
              {merchant}
            </Typography>
          </div>
          {location && (
            <div className="flex items-center gap-1.5 ml-6">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <Typography variant="span" size="xs" className="text-muted-foreground">
                {location}
              </Typography>
            </div>
          )}
        </div>
      </td>
      <td className="p-4 w-40">
        <div className="flex flex-col gap-2">
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md border w-fit',
            scoreColors.bg,
            scoreColors.border
          )}>
            <AlertTriangle className={cn('h-3.5 w-3.5', scoreColors.text)} />
            <Typography
              variant="span"
              size="sm"
              weight="bold"
              className={scoreColors.text}
            >
              {score}
            </Typography>
          </div>
        </div>
      </td>
      <td className="p-4 w-40">
        <StatusBadge status={status} />
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          {customerName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Typography variant="span" size="xs" className="text-foreground">
                {customerName}
              </Typography>
            </div>
          )}
          {customerEmail && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <Typography variant="span" size="xs" className="text-muted-foreground truncate max-w-[150px]">
                {customerEmail}
              </Typography>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

