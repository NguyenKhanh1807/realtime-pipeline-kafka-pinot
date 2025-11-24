'use client';

import { Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { AlertTriangle, CheckCircle, CircleX } from 'lucide-react';

export interface RiskScoreBadgeProps {
  score: number;
  status: string;
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score < 30) {
    return {
      text: 'text-[#47d5a6]',
      bg: 'bg-[#22946e]/20',
      border: 'border-[#47d5a6]/40',
    };
  }
  if (score < 70) {
    return {
      text: 'text-[#d7ac61]',
      bg: 'bg-[#a87a2a]/20',
      border: 'border-[#d7ac61]/40',
    };
  }
  return {
    text: 'text-[#d94a4a]',
    bg: 'bg-[#9c2121]/20',
    border: 'border-[#d94a4a]/40',
  };
};

const getScoreIcon = (score: number) => {
  if (score < 30) {
    return <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#47d5a6]" />;
  }
  if (score < 70) {
    return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#d7ac61]" />;
  }
  return <CircleX className="h-4 w-4 flex-shrink-0 text-[#d94a4a]" />;
};

export function RiskScoreBadge({ score, status, className }: RiskScoreBadgeProps) {
  const scoreColors = getScoreColor(score);

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 shadow-sm w-20 backdrop-blur-sm',
      scoreColors.bg,
      scoreColors.border,
      className
    )}>
      {getScoreIcon(score)}
      <div className="flex flex-col text-center w-full">
        <Typography variant="span" size="sm" weight="bold" className={scoreColors.text}>
          {score}
        </Typography>
      </div>
    </div>
  );
}

