'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsAuthenticated, useIsAdmin } from '@/src/contexts';
import { LoadingOverlay } from '@/src/components/atoms';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
  requireAdmin = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (requireAuth && requireAdmin && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (!requireAuth && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, requireAuth, requireAdmin, redirectTo, router]);

  // Show loading while checking authentication and admin status
  if (requireAuth && !isAuthenticated) {
    return <LoadingOverlay text="Loading..." />;
  }

  if (requireAuth && requireAdmin && !isAdmin) {
    return <LoadingOverlay text="Loading..." />;
  }

  return <>{children}</>;
}

