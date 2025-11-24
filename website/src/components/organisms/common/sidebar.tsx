'use client';

import {
  SidebarBrand,
  SidebarNavigation,
  UserMenu,
  type NavigationItem,
} from '@/src/components/molecules';
import { cn } from '@/src/lib';

export interface SidebarProps {
  isOpen: boolean;
  navigationItems: NavigationItem[];
  currentPath: string;
  isAdmin: boolean;
  userInitials: string;
  userDisplayName: string;
  userRole?: string;
  onNavigate: (href: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  className?: string;
}

export function Sidebar({
  isOpen,
  navigationItems,
  currentPath,
  isAdmin,
  userInitials,
  userDisplayName,
  userRole,
  onNavigate,
  onProfileClick,
  onLogout,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 h-screen',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Logo/Brand */}
        <SidebarBrand />

        {/* Navigation */}
        <SidebarNavigation
          items={navigationItems}
          currentPath={currentPath}
          isAdmin={isAdmin}
          onNavigate={onNavigate}
        />

        {/* User Menu */}
        <UserMenu
          initials={userInitials}
          displayName={userDisplayName}
          role={userRole}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
}

