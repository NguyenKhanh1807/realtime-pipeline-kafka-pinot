'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/atoms';
import { UserMenuTrigger } from './user-menu-trigger';
import { User, LogOut } from 'lucide-react';

export interface UserMenuProps {
  initials: string;
  displayName: string;
  role?: string;
  onProfileClick: () => void;
  onLogout: () => void;
  className?: string;
}

export function UserMenu({
  initials,
  displayName,
  role,
  onProfileClick,
  onLogout,
  className,
}: UserMenuProps) {
  return (
    <div className={`border-t border-border shrink-0 ${className || ''}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UserMenuTrigger
            initials={initials}
            displayName={displayName}
            role={role}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          sideOffset={8}
          align="end"
          className="w-56 mb-2 border-border z-[60]"
        >
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

