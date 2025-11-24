'use client';

import { Button } from '@/src/components/atoms';
import { Breadcrumb, ThemeSwitcher } from '@/src/components/molecules';
import { Menu, X } from 'lucide-react';
import { cn } from '@/src/lib';

export interface DashboardHeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  className?: string;
}

export function DashboardHeader({
  sidebarOpen,
  onSidebarToggle,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6',
        className
      )}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="lg:hidden"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
      </div>
    </header>
  );
}

