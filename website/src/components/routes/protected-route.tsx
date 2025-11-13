'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsAuthenticated, useIsAdmin, useIsLoading } from '@/src/contexts';
import { useAppStore } from '@/src/view-models/stores';
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
  const isLoading = useIsLoading();

  useEffect(() => {
    // Wait for initialization to complete before checking auth
    if (isLoading) {
      return;
    }

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (requireAuth && requireAdmin && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (!requireAuth && isAuthenticated) {
      // Redirect based on user role
      const user = useAppStore.getState().user;
      if (user?.role === 'user') {
        router.push('/checkout');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, requireAuth, requireAdmin, redirectTo, router]);

  // Show loading while initializing or checking authentication
  if (isLoading) {
    return <LoadingOverlay text="Loading..." />;
  }

  // Show loading while checking authentication and admin status
  if (requireAuth && !isAuthenticated) {
    return <LoadingOverlay text="Loading..." />;
  }

  if (requireAuth && requireAdmin && !isAdmin) {
    return <LoadingOverlay text="Loading..." />;
  }

  return <>{children}</>;
}

