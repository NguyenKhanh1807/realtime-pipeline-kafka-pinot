'use client';

import { UserAvatar } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { ChevronDown } from 'lucide-react';
import React from 'react';

export interface UserMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string;
  displayName: string;
  status?: string;
}

export const UserMenuTrigger = React.forwardRef<HTMLButtonElement, UserMenuTriggerProps>(
  ({ initials, displayName, status = 'Online', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'w-full flex items-center justify-between p-4 transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'group rounded-none focus:outline-none focus-visible:ring-0',
          className
        )}
        aria-label="User menu"
        {...props}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <UserAvatar initials={initials} />
          </div>
          {/* User info */}
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">{status}</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground ml-2 shrink-0" />
      </button>
    );
  }
);

UserMenuTrigger.displayName = 'UserMenuTrigger';

