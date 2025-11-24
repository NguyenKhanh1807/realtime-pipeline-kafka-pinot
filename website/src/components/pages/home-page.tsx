'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsAuthenticated } from '@/src/contexts/app-context';
import { useAppStore } from '@/src/view-models/stores';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();

  // Redirect authenticated users based on role, others to login
  useEffect(() => {
    if (isAuthenticated) {
      const user = useAppStore.getState().user;
      // USER role goes to checkout, ADMIN role goes to dashboard
      if (user?.role === 'user') {
        router.push('/checkout');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading state while redirecting
  return null;
}
