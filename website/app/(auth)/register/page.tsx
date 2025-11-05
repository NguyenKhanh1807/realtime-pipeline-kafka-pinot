'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/src/components/molecules/login-form';
import { ThemeToggle } from '@/src/components/molecules/theme-switcher';
import { AuthLayout } from '@/src/layouts';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { useAppStore } from '@/src/viewmodels/stores';
import { validateRegisterForm, type RegisterFormData } from '@/src/viewmodels/validators/auth-validators';
import { cn } from '@/src/lib/utils';
import { AlertTriangle, Eye, EyeOff, Mail, Lock, User, UserCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, register } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string | null>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateRegisterForm(formData);
    setErrors(validationErrors);

    // Check if there are any errors
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;

    setIsLoading(true);
    setError(null);

    try {
      await register(formData);
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join our fraud detection team"
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
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-2">
            <Typography variant="span" size="sm" weight="medium" className="text-foreground">
              First Name
            </Typography>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={cn(
                  'pl-10 h-11',
                  errors.firstName && 'border-destructive focus:border-destructive'
                )}
                disabled={isLoading}
              />
            </div>
            {errors.firstName && (
              <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                {errors.firstName}
              </Typography>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Typography variant="span" size="sm" weight="medium" className="text-foreground">
              Last Name
            </Typography>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={cn(
                  'pl-10 h-11',
                  errors.lastName && 'border-destructive focus:border-destructive'
                )}
                disabled={isLoading}
              />
            </div>
            {errors.lastName && (
              <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                {errors.lastName}
              </Typography>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            Email
          </Typography>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={cn(
                'pl-10 h-11',
                errors.email && 'border-destructive focus:border-destructive'
              )}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <Typography variant="p" size="sm" color="destructive" className="text-destructive">
              {errors.email}
            </Typography>
          )}
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-1 gap-4">
          {/* Password */}
          <div className="space-y-2">
            <Typography variant="span" size="sm" weight="medium" className="text-foreground">
              Password
            </Typography>
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
            {errors.password && (
              <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                {errors.password}
              </Typography>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Typography variant="span" size="sm" weight="medium" className="text-foreground">
              Confirm Password
            </Typography>
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
            {errors.confirmPassword && (
              <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                {errors.confirmPassword}
              </Typography>
            )}
          </div>
        </div>

        {/* Terms Acceptance */}
        <div className="space-y-2">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border border-input text-primary focus:ring-primary"
              disabled={isLoading}
            />
            <div className="flex-1">
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                I agree to the{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline">
                  Terms of Service
                </Button>{' '}
                and{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline">
                  Privacy Policy
                </Button>
              </Typography>
            </div>
          </label>
          {errors.acceptTerms && (
            <Typography variant="p" size="sm" color="destructive" className="text-destructive">
              {errors.acceptTerms}
            </Typography>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-blue-primary hover:bg-blue-primary/90"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
            className="p-0 h-auto text-sm text-blue-primary hover:text-blue-primary/80"
            onClick={handleSwitchToLogin}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </Typography>
      </div>
    </AuthLayout>
  );
}
