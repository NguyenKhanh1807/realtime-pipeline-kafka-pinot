'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsAuthenticated } from '@/src/contexts/app-context';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();

  // Redirect authenticated users to dashboard, others to login
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading state while redirecting
  return null;
}
