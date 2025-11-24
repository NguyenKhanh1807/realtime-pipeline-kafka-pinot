'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Typography, Button } from '@/src/components/atoms';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { log as logger } from '@/src/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors in component tree and displays fallback UI
 * Prevents white screen of death and provides error recovery options
 * 
 * Placement: organisms/common (cross-cutting infrastructure component)
 * MVVM: Pure View layer - no ViewModel or Model dependencies
 * Atomic Design: Organism level - complex, reusable UI section
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error('React Error Boundary caught an error', error, {
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <Typography variant="h1" size="xl" weight="bold" className="text-foreground">
            Something went wrong
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
            We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
          </Typography>
        </div>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-muted rounded-lg text-left">
            <Typography variant="p" size="xs" weight="medium" className="text-destructive mb-2">
              Error Details (Development Only):
            </Typography>
            <pre className="text-xs text-muted-foreground overflow-auto">
              {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onReset}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook-based Error Boundary wrapper for functional components
 * Use this when you need error boundaries in functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

