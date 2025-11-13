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
      return 'bg-[#9c2121]/20 text-[#d94a4a] border-2 border-[#d94a4a]/30';
    }
    if (riskLevel === 'high') {
      return 'bg-[#a87a2a]/20 text-[#d7ac61] border-2 border-[#d7ac61]/30';
    }
    if (riskLevel === 'medium') {
      return 'bg-[#a87a2a]/20 text-[#d7ac61] border-2 border-[#d7ac61]/30';
    }
    if (riskLevel === 'low') {
      return 'bg-[#22946e]/20 text-[#47d5a6] border-2 border-[#47d5a6]/30';
    }
    if (type === 'system') {
      return 'bg-[#e7cbe2]/20 text-[#e7cbe2] border-2 border-[#e7cbe2]/30';
    }
    return 'bg-[#21498a]/20 text-[#4077d1] border-2 border-[#4077d1]/30';
  };

  return (
    <div className={cn('p-5 hover:bg-[var(--clr-surface-a10)] transition-all duration-200', className)}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm',
          getIconStyles()
        )}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <Typography variant="p" size="sm" weight="semibold" className="text-foreground">
              {user}
            </Typography>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono">{time}</span>
            </div>
          </div>
          <Typography variant="p" size="sm" className="text-muted-foreground leading-relaxed">
            {action}
          </Typography>
        </div>
      </div>
    </div>
  );
}

