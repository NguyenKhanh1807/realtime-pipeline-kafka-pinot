'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib';

interface BreadcrumbItem {
  name: string;
  href: string;
  icon?: LucideIcon;
}

export function Breadcrumb() {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Home', href: '/dashboard', icon: Home }];

    // Map path names to display names
    const pathNameMap: Record<string, string> = {
      'transaction': 'Fraud Detection',
      'transactions': 'Transactions',
      'user-management': 'User Management',
      'admin': 'Admin',
      'score': 'Score',
      'profile': 'Profile',
    };

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const displayName = pathNameMap[path] || path
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Skip if it's the dashboard (already added as Home)
      if (currentPath !== '/dashboard') {
        breadcrumbs.push({
          name: displayName,
          href: currentPath,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Always show breadcrumb, even if it's just "Home" on dashboard
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = crumb.icon;

        return (
          <div key={crumb.href} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground flex items-center space-x-1">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{crumb.name}</span>
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors",
                  crumb.icon && "font-medium"
                )}
              >
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                <span>{crumb.name}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

