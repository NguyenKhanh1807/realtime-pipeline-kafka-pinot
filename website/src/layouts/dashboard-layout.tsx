'use client';

import { Button } from '@/src/components/atoms/button';
import { useAppStore } from '@/src/viewmodels/stores';
import { useIsAdmin, useUserDisplayName, useUser } from '@/src/contexts/app-context';
import { cn } from '@/src/lib/utils';
import { Menu, X, Home, User, LogOut, Shield, ChevronUp, Activity, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Fraud Detection', href: '/transaction', icon: Shield },
  { name: 'Database Management', href: '/database-management', icon: Database },
  { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen, setSidebarOpen, logout } = useAppStore();
  const isAdmin = useIsAdmin();
  const userDisplayName = useUserDisplayName();
  const user = useUser();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    router.push('/profile');
  };

  const getUserInitials = () => {
    if (user?.name) {
      const { first, last } = user.name;
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return userDisplayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
            <h1 className="text-xl font-bold text-foreground">Administration</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigationItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push(item.href)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                );
              })}
          </nav>

          {/* User section - Footer */}
          <div className="border-t border-border">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  {/* User info */}
                  <div className="text-left">
                <p className="text-sm font-medium text-foreground">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
                </div>
                {/* Settings button */}
                <div className="flex items-center">
                  <ChevronUp
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      dropdownOpen ? "rotate-180" : ""
                    )}
                  />
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute bottom-full left-0 right-0 z-20 mx-4 mb-2 bg-popover border border-border rounded-md shadow-lg">
                    <div className="py-1">
                      <button
                        onClick={handleProfileClick}
                        className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </button>
                      <button
                onClick={handleLogout}
                        className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                        <LogOut className="mr-3 h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-0">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
