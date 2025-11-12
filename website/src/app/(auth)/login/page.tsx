'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/src/components/molecules/login-form';
import { ThemeToggle } from '@/src/components/molecules/theme-switcher';
import { AuthLayout } from '@/src/components/layouts';
import { useIsAuthenticated, useError, useIsLoading } from '@/src/contexts/app-context';
import { cn } from '@/src/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const error = useError();
  const isLoading = useIsLoading();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  const handleSwitchToRegister = () => {
    router.push('/register');
  };

  // Show loading state
  if (isAuthenticated) {
    return (
      <AuthLayout title="Redirecting..." subtitle="Please wait while we redirect you">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
      header={<ThemeToggle />}
    >
      {/* Error Alert */}
      {error && (
        <div className={cn(
          'p-4 rounded-lg border border-destructive/20 bg-destructive/10',
          'flex items-start space-x-3'
        )}>
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <Typography variant="p" size="sm" weight="medium" color="destructive" className="text-destructive">
              Authentication Error
            </Typography>
            <Typography variant="p" size="sm" color="destructive" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/20"
            onClick={() => {
              // Clear error - this would typically be handled by the store
              console.log('Clear error clicked');
            }}
          >
            ×
          </Button>
        </div>
      )}

      <LoginForm
        onSuccess={handleLoginSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* Demo Credentials */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
        <Typography variant="p" size="sm" weight="medium" className="text-foreground mb-2">
          Demo Credentials
        </Typography>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div><strong>Username:</strong> yuiiuy</div>
          <div><strong>Password:</strong> any password (API accepts any for demo)</div>
        </div>
        <Typography variant="p" size="xs" color="muted" className="text-muted-foreground mt-2">
          Use these credentials to test the login functionality with real API
        </Typography>
      </div>
    </AuthLayout>
  );
}
