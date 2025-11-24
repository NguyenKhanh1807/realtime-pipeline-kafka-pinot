'use client';

import { Button } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { LucideIcon } from 'lucide-react';

export interface NavigationButtonProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function NavigationButton({
  name,
  href,
  icon: Icon,
  isActive,
  onClick,
  className,
}: NavigationButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start rounded-md transition-all duration-200 ease-in-out',
        'group relative',
        'px- py-2.5 h-auto',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm font-semibold hover:bg-muted/50 hover:!text-foreground'
          : 'text-foreground/70 hover:bg-primary hover:!text-foreground',
        className
      )}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'mr-3 h-3 w-3 transition-all duration-200 shrink-0',
          'group-hover:scale-110',
          isActive
            ? 'text-primary-foreground group-hover:!text-foreground'
            : 'text-muted-foreground group-hover:!text-foreground'
        )}
      />
      <span className="font-medium text-xs pb-0.5">{name}</span>
    </Button>
  );
}

