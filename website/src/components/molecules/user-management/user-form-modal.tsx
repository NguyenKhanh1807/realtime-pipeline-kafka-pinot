'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue , Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/components/atoms';
import { ROLE_DEFINITIONS, type User as UserType, type UserRole } from '@/src/types';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '@/src/lib';

export interface UserFormModalProps {
  title: string;
  user?: UserType;
  onSubmit: (user: Partial<UserType>) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  open: boolean;
}

export function UserFormModal({
  title,
  user,
  onSubmit,
  onClose,
  loading,
  open,
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    username: user?.id || '', // user.id contains the username
    role: (user?.role || 'user') as UserRole,
    oldPassword: '', // Old password for verification when editing
    newPassword: '', // New password when editing
    confirmPassword: '', // Confirm new password when editing
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Reset form data when user changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        username: user?.id || '', // user.id contains the username
        role: (user?.role || 'user') as UserRole,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (user) {
      // When editing, validate password fields
      if (formData.newPassword.trim() || formData.confirmPassword.trim() || formData.oldPassword.trim()) {
        // If any password field is filled, all must be filled
        if (!formData.oldPassword.trim()) {
          newErrors.oldPassword = 'Current password is required';
        }
        if (!formData.newPassword.trim()) {
          newErrors.newPassword = 'New password is required';
        }
        if (!formData.confirmPassword.trim()) {
          newErrors.confirmPassword = 'Please confirm your new password';
        }

        // Validate password match
        if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        // Validate password length
        if (formData.newPassword && formData.newPassword.length < 8) {
          newErrors.newPassword = 'Password must be at least 8 characters';
        }
      }
    } else {
      // When creating, username is required
      if (!formData.username.trim()) {
        // This is handled by required attribute
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // When editing (user exists), send password fields
    if (user) {
      // Only submit if password fields are filled
      if (formData.oldPassword.trim() || formData.newPassword.trim() || formData.confirmPassword.trim()) {
        const submitData: Partial<UserType> = {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        } as any;
        await onSubmit(submitData);
      } else {
        // No password change requested
        return;
      }
    } else {
      // When creating, send all fields
      await onSubmit({
        id: formData.username,
        role: formData.role,
      });
    }
    // Reset form after successful submit
    if (!user) {
      setFormData({
        username: '',
        role: 'user',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } else {
      // Reset password fields after successful edit
      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username and Role in the same row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Username
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
                placeholder="Enter username"
                disabled={!!user}
                className={user ? 'bg-muted cursor-not-allowed' : ''}
              />
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Username cannot be changed after user creation
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                disabled={!!user}
              >
                <SelectTrigger className={user ? 'bg-muted cursor-not-allowed' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLE_DEFINITIONS).map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Role cannot be changed after user creation
                </p>
              )}
            </div>
          </div>

          {/* Password fields - only show when editing */}
          {user && (
            <>
              {/* Old Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showOldPassword ? 'text' : 'password'}
                    value={formData.oldPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, oldPassword: e.target.value }));
                      if (errors.oldPassword) {
                        setErrors(prev => ({ ...prev, oldPassword: undefined }));
                      }
                    }}
                    placeholder="Enter current password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.oldPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.oldPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.oldPassword}</p>
                )}
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (errors.newPassword) {
                        setErrors(prev => ({ ...prev, newPassword: undefined }));
                      }
                      // Clear confirm password error if passwords now match
                      if (formData.confirmPassword && e.target.value === formData.confirmPassword && errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Enter new password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.newPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Confirm new password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.confirmPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

