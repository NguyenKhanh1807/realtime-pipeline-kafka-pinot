'use client';

import { cn } from '@/src/lib';

export interface UserAvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function UserAvatar({
  initials,
  size = 'md',
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-primary text-primary-foreground',
        'flex items-center justify-center font-medium',
        'transition-transform duration-200 group-hover:scale-105',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

