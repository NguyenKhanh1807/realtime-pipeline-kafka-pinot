'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue , Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/components/atoms';
import { ROLE_DEFINITIONS, type User as UserType, type UserRole } from '@/src/types';

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
    email: user?.email || '',
    firstName: user?.name.first || '',
    lastName: user?.name.last || '',
    role: (user?.role || 'viewer') as UserRole,
    isActive: user?.isActive ?? true,
  });

  // Reset form data when user changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        email: user?.email || '',
        firstName: user?.name.first || '',
        lastName: user?.name.last || '',
        role: (user?.role || 'viewer') as UserRole,
        isActive: user?.isActive ?? true,
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      email: formData.email,
      name: { first: formData.firstName, last: formData.lastName },
      role: formData.role,
      isActive: formData.isActive,
    });
    // Reset form after successful submit
    if (!user) {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'viewer',
        isActive: true,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                First Name
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Name
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Role
            </label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}>
              <SelectTrigger>
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
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border border-input"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-foreground">
              Active User
            </label>
          </div>

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

