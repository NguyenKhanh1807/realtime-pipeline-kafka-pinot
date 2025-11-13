'use client';

import { ScrollArea } from '@/src/components/atoms';
import { NavigationButton } from './navigation-button';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  userOnly?: boolean;
}

export interface SidebarNavigationProps {
  items: NavigationItem[];
  currentPath: string;
  isAdmin: boolean;
  onNavigate: (href: string) => void;
  className?: string;
}

export function SidebarNavigation({
  items,
  currentPath,
  isAdmin,
  onNavigate,
  className,
}: SidebarNavigationProps) {
  const filteredItems = items.filter((item) => {
    // Show admin-only items only to admins
    if (item.adminOnly && !isAdmin) return false;
    // Show user-only items only to non-admins
    if (item.userOnly && isAdmin) return false;
    // Show items without restrictions to everyone
    return true;
  });

  return (
    <ScrollArea className={`flex-1 overflow-hidden ${className || ''}`}>
      <nav className="space-y-0.5 py-4 px-2" role="navigation" aria-label="Main navigation">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <NavigationButton
              key={item.name}
              name={item.name}
              href={item.href}
              icon={Icon}
              isActive={isActive}
              onClick={() => onNavigate(item.href)}
            />
          );
        })}
      </nav>
    </ScrollArea>
  );
}

