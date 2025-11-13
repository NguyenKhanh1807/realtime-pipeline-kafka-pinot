'use client';

import { ScrollArea } from '@/src/components/atoms';
import { DashboardHeader, MobileOverlay, NavigationItem} from '@/src/components/molecules';
import { Sidebar } from '@/src/components/organisms';
import { useAppStore } from '@/src/view-models';
import { useIsAdmin, useUserDisplayName, useUser } from '@/src/contexts';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useMemo, useCallback } from 'react';
import { Home, AlertTriangle, Users, CreditCard } from 'lucide-react';

interface DashboardTemplateProps {
  children: ReactNode;
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, adminOnly: true },
  { name: 'Fraud Detection', href: '/fraud-detection', icon: AlertTriangle, adminOnly: true },
  { name: 'Transactions', href: '/transactions', icon: CreditCard, adminOnly: true },
  { name: 'User Management', href: '/user-management', icon: Users, adminOnly: true },
];

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const { sidebarOpen, setSidebarOpen, logout } = useAppStore();
  const isAdmin = useIsAdmin();
  const userDisplayName = useUserDisplayName();
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleNavigate = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  const userInitials = useMemo(() => {
    if (user?.name) {
      const { first, last } = user.name;
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return userDisplayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  }, [user, userDisplayName]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        navigationItems={navigationItems}
        currentPath={pathname}
        isAdmin={isAdmin}
        userInitials={userInitials}
        userDisplayName={userDisplayName}
        userStatus="Online"
        onNavigate={handleNavigate}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />

      {/* Mobile overlay */}
      <MobileOverlay isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-0">
        {/* Top bar */}
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          onSidebarToggle={handleSidebarToggle}
        />

        {/* Page content */}
        <ScrollArea className="flex-1 overflow-auto">
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
