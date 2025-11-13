'use client';

import { cn } from '@/src/lib';

export interface LogoProps {
  iconText?: string;
  primaryText?: string;
  secondaryText?: string;
  className?: string;
}

export function Logo({
  iconText = 'RP',
  primaryText = 'Realtime',
  secondaryText = 'Pinot',
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {/* Logo icon */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">{iconText}</span>
      </div>
      {/* Brand name */}
      <div className="mb-1">
        <h1 className="text-md font-bold text-foreground">{primaryText}</h1>
        <p className="text-xs text-muted-foreground -mt-1">{secondaryText}</p>
      </div>
    </div>
  );
}

