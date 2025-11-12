'use client';

import { useState } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { Typography } from '@/src/components/atoms/typography';
import { AuthCommands } from '@/src/viewmodels/commands/auth-commands';
import { validateLoginForm, type LoginFormData } from '@/src/viewmodels/validators/auth-validators';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { auditLogger } from '@/src/services/audit-logger';
import { cn } from '@/src/lib/utils';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, onSwitchToRegister, className }: LoginFormProps) {
  const { correlationId } = useCorrelation();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string | null>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateLoginForm(formData);
    setErrors(validationErrors);

    // Check if there are any errors
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      await AuthCommands.login(formData);

      // Log successful login
      await auditLogger.logAuthentication(
        'login',
        'user-id-placeholder', // In real app, get from response
        formData.username,
        'success',
        correlationId,
        {
          rememberMe: formData.rememberMe,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      );

      onSuccess?.();
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed login
      await auditLogger.logAuthentication(
        'login',
        '',
        formData.username,
        'failure',
        correlationId,
        {
          error: error instanceof Error ? error.message : 'Login failed',
          userAgent: navigator.userAgent,
          duration,
        }
      );

      // Error is handled by the command and displayed through the store
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
          Welcome Back
        </Typography>
        <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
          Sign in to your account to continue
        </Typography>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div className="space-y-2">
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            Username
          </Typography>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={cn(
                'pl-10 h-11',
                errors.username && 'border-destructive focus:border-destructive'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.username && (
            <Typography variant="p" size="sm" color="destructive" className="text-destructive">
              {errors.username}
            </Typography>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            Password
          </Typography>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={cn(
                'pl-10 pr-10 h-11',
                errors.password && 'border-destructive focus:border-destructive'
              )}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.password && (
            <Typography variant="p" size="sm" color="destructive" className="text-destructive">
              {errors.password}
            </Typography>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
              className="h-4 w-4 rounded border border-input text-primary focus:ring-primary"
              disabled={isLoading}
            />
            <Typography variant="span" size="sm" className="text-foreground">
              Remember me
            </Typography>
          </label>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            disabled={isLoading}
          >
            Forgot password?
          </Button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center">
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Don't have an account?{' '}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            Sign up
          </Button>
        </Typography>
      </div>
    </div>
  );
}
