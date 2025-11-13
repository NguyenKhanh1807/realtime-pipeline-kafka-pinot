'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { AlertTriangle, CheckCircle, CreditCard, Settings, Clock } from 'lucide-react';

export interface ActivityItemProps {
  id: string;
  user: string;
  action: string;
  time: string;
  type?: 'fraud' | 'clean' | 'system';
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  className?: string;
}

export function ActivityItem({
  user,
  action,
  time,
  type,
  riskLevel,
  className,
}: ActivityItemProps) {
  const getIcon = () => {
    if (riskLevel === 'critical' || riskLevel === 'high' || riskLevel === 'medium') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (riskLevel === 'low') {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (type === 'system') {
      return <Settings className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />;
  };

  const getIconStyles = () => {
    if (riskLevel === 'critical') {
      return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
    }
    if (riskLevel === 'high') {
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400';
    }
    if (riskLevel === 'medium') {
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400';
    }
    if (riskLevel === 'low') {
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
    }
    if (type === 'system') {
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
    }
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
  };

  return (
    <div className={cn('p-4 hover:bg-muted/50 transition-colors', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', getIconStyles())}>
            {getIcon()}
          </div>
          <div>
            <Typography variant="p" size="sm" weight="medium" className="text-foreground">
              {user}
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              {action}
            </Typography>
          </div>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {time}
        </div>
      </div>
    </div>
  );
}

