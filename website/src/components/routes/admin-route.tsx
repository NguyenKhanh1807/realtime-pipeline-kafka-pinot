'use client';

import { ProtectedRoute } from './protected-route';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Convenience wrapper for admin-only routes.
 * Equivalent to <ProtectedRoute requireAdmin={true}>
 */
export function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute requireAdmin={true}>
      {children}
    </ProtectedRoute>
  );
}

