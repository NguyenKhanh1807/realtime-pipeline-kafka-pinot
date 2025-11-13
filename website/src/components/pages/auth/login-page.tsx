'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/src/components/organisms';
import { ThemeToggle } from '@/src/components/molecules';
import { AuthTemplate } from '@/src/components/templates';
import { useError, useApp } from '@/src/contexts/app-context';
import { toast } from '@/src/components/atoms';

export default function LoginPage() {
  const router = useRouter();
  const error = useError();
  const { clearError } = useApp();

  // Show toast when error occurs
  useEffect(() => {
    if (error) {
      toast.error('Authentication Error', {
        description: error,
        duration: 5000,
      });
      // Clear error after showing toast to prevent duplicate toasts
      // Use setTimeout to ensure toast is shown before clearing
      const timeoutId = setTimeout(() => {
        clearError();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [error, clearError]);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  const handleSwitchToRegister = () => {
    router.push('/register');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      {/* Theme switcher in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Login Form Section */}
        <AuthTemplate
          title="Welcome Back"
          subtitle="Sign in to your account to continue"
        >
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}
