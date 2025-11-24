'use client';

import { useState } from 'react';
import { Button, Input, Loading, Typography } from '@/src/components/atoms';
import { InputField, FormField } from '@/src/components/molecules';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { log as logger, cn } from '@/src/lib';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { AuthCommands, validateLoginForm, type LoginFormData } from '@/src/view-models';

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

    const validationErrors = validateLoginForm(formData);
    setErrors(validationErrors);
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      await AuthCommands.login(formData);

      // Log successful login
      logger.info('User login successful', {
        correlationId,
        userId: 'user-id-placeholder', // In real app, get from response
        metadata: {
          username: formData.username,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      });

      onSuccess?.();
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed login
      logger.warn('User login failed', {
        correlationId,
        userId: '',
        metadata: {
          username: formData.username,
          error: error instanceof Error ? error.message : 'Login failed',
          userAgent: navigator.userAgent,
          duration,
        }
      });

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <InputField
          label="Username"
          type="text"
          placeholder="Enter your username"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          error={errors.username}
          disabled={isLoading}
          icon={<Mail className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Password Field */}
        <FormField
          label="Password"
          error={errors.password}
          className="space-y-3"
        >
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
        </FormField>


        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          className="w-full h-11 mt-4 font-semibold rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loading size="sm" variant="spinner" className="border-white border-t-transparent" />
              <span className="text-white">Signing in...</span>
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
