'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/src/components/atoms';
import { InputField, FormField } from '@/src/components/molecules';
import { AuthCommands, type RegisterFormData } from '@/src/view-models';
import { cn } from '@/src/lib';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

export function RegisterForm({ onSuccess, onSwitchToLogin, className }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string | null>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TEMPORARILY DISABLED: Skip validation
    // const validationErrors = validateRegisterForm(formData);
    // setErrors(validationErrors);
    // const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    // if (hasErrors) return;

    setIsLoading(true);
    setError(null);

    try {
      await AuthCommands.register(formData);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <div className={cn(
          'p-4 rounded-lg border border-destructive/20 bg-destructive/10',
          'flex items-start space-x-3'
        )}>
          <div className="flex-1">
            <Typography variant="p" size="sm" weight="medium" color="destructive" className="text-destructive">
              Registration Error
            </Typography>
            <Typography variant="p" size="sm" color="destructive" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
        </div>
      )}

      {/* Registration Form */}
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
          icon={<User className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Password Fields */}
        <div className="space-y-4">
          {/* Password */}
          <FormField
            label="Password"
            error={errors.password}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
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

          {/* Confirm Password */}
          <FormField
            label="Confirm Password"
            error={errors.confirmPassword}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.confirmPassword && 'border-destructive focus:border-destructive'
                )}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </FormField>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          className="w-full h-11 mt-4 font-semibold rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Account...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center">
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Already have an account?{' '}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </Typography>
      </div>
    </div>
  );
}
