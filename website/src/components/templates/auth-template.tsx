'use client';

import { cn } from '@/src/lib/utils';
import { ReactNode } from 'react';
import { Shield } from 'lucide-react';

interface AuthTemplateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
  title = "Welcome",
  subtitle = "Please sign in to your account",
  header
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Theme switcher in top right */}
      {header && (
        <div className="absolute top-4 right-4 z-10">
          {header}
        </div>
      )}

      <div className="w-full max-w-md space-y-8 pb-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Auth form container */}
        <div className={cn(
          'bg-card border border-border rounded-lg shadow-lg',
          'px-6 py-8 sm:px-8'
        )}>
          {children}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-8 top-8 opacity-5">
          <Shield className="h-64 w-64 text-muted-foreground" />
        </div>
        <div className="absolute left-8 bottom-16 opacity-5">
          <Shield className="h-48 w-48 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default AuthTemplate;

