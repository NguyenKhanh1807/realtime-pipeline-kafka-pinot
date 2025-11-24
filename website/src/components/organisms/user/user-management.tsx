'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Typography, toast } from '@/src/components/atoms';
import {
  UserStatsCards,
  UserFilters,
  UserTable,
  UserFormModal,
} from '@/src/components/molecules';
import { cn } from '@/src/lib';
import type {
  User as UserType,
  UserRole
} from '@/src/types';
import {
  ROLE_DEFINITIONS,
  canManageRole
} from '@/src/types';
import { useUserManagementStore } from '@/src/view-models/stores/user-management-store';
import { UserPlus } from 'lucide-react';

interface UserManagementProps {
  currentUser: UserType;
  onUserCreate?: (user: Partial<UserType>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<UserType>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
  className?: string;
}

export function UserManagement({
  currentUser,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  className
}: UserManagementProps) {
  // Use ViewModel store instead of local state and direct service calls
  const {
    users,
    isLoading: apiLoading,
    loadUsers,
    createUser,
    updateUserPassword,
    deleteUser,
    setFilters,
  } = useUserManagementStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  // Load users using ViewModel store
  const handleLoadUsers = useCallback(async () => {
    try {
      await loadUsers({
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
    } catch (error) {
      // Error is handled by store
      console.error('Error loading users:', error);
    }
  }, [searchTerm, roleFilter, loadUsers]);

  // Load users on mount
  useEffect(() => {
    handleLoadUsers();
  }, []); // Only on mount

  // Update filters and reload when search or role changes
  useEffect(() => {
    setFilters({
      search: searchTerm || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
    });

    const timer = setTimeout(() => {
      handleLoadUsers();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, setFilters, handleLoadUsers]);

  // Apply client-side filtering for all filters
  // This ensures filtering works even if API doesn't support it or returns all users
  const filteredUsers = users.filter(user => {
    // Search filter - match against username (stored in id field)
    const matchesSearch = !searchTerm || user.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (userData: Partial<UserType>) => {
    if (currentUser.role !== 'admin') return;

    setLoading(true);
    try {
      // Get username from id field (form sends username as id)
      const username = userData.id || '';

      if (!username || username.trim() === '') {
        throw new Error('Username is required');
      }

      // Use ViewModel command to create user
      // For admin users, password is hardcoded in the API call (TempPassword123!)
      // For regular users, password should be provided
      const userRole = (userData.role || 'user').toLowerCase() as 'admin' | 'user';
      const isAdmin = userRole === 'admin';
      
      await createUser({
        username: username.trim(),
        // Password is only required for non-admin users
        // Admin users get hardcoded password: TempPassword123!
        password: isAdmin ? undefined : 'TempPassword123!',
        role: userRole,
        component: 'CONTROLLER',
      });

      // Reload users to get updated list
      await handleLoadUsers();

      await onUserCreate?.(userData);
      setShowCreateForm(false);

      toast.success(`User "${username}" created successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast.error('Failed to create user', {
        description: errorMessage,
      });
      throw error; // Re-throw to show error in UI
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserType>) => {
    if (currentUser.role !== 'admin') return;

    setLoading(true);
    try {
      const currentUserData = users.find(u => u.id === userId);
      if (!currentUserData) {
        throw new Error('User not found');
      }

      // Get password fields from updates
      const oldPassword = (updates as any).oldPassword;
      const newPassword = (updates as any).newPassword;
      const confirmPassword = (updates as any).confirmPassword;

      // Use username instead of userId since user.id === user.username in this system
      // This ensures we're using the correct identifier for the API
      const username = currentUserData.username || userId;

      // Use ViewModel command to update password
      await updateUserPassword(username, {
        oldPassword,
        newPassword,
        confirmPassword,
      });

      await onUserUpdate?.(userId, updates);
      setEditingUser(null);

      toast.success(`User "${userId}" updated successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      toast.error('Failed to update user', {
        description: errorMessage,
      });
      throw error; // Re-throw to show error in UI
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (currentUser.role !== 'admin') return;
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;

    setLoading(true);
    try {
      // Use ViewModel command to delete user
      await deleteUser(username);

      await onUserDelete?.(username);

      toast.success(`User "${username}" deleted successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error('Failed to delete user', {
        description: errorMessage,
      });
      throw error; // Re-throw to show error in UI
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const canEditUser = (user: UserType) => {
    return currentUser.role === 'admin' && canManageRole(currentUser.role, user.role);
  };

  const canDeleteUser = (user: UserType) => {
    return currentUser.role === 'admin' && canManageRole(currentUser.role, user.role);
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
              User Management
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-0.5">
              Manage user accounts and roles
            </Typography>
          </div>

          {currentUser.role === 'admin' && (
            <Button onClick={() => setShowCreateForm(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Statistics */}
        <UserStatsCards users={users} isLoading={apiLoading} />
      </div>

      {/* Filters */}
      <UserFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onClearFilters={async () => {
          setSearchTerm('');
          setRoleFilter('all');
          // Clear filters in store
          setFilters({
            search: undefined,
            role: undefined,
          });
          // Explicitly refetch users with cleared filters
          try {
            await loadUsers({});
          } catch (error) {
            console.error('Error loading users after clearing filters:', error);
          }
        }}
      />

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        currentUser={currentUser}
        canEdit={canEditUser}
        canDelete={canDeleteUser}
        onEdit={setEditingUser}
        onDelete={handleDeleteUser}
        onCreateFirst={() => setShowCreateForm(true)}
        isLoading={apiLoading}
      />

      {/* Create User Modal */}
      <UserFormModal
        title="Create User"
        onSubmit={handleCreateUser}
        onClose={() => setShowCreateForm(false)}
        loading={loading}
        open={showCreateForm}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <UserFormModal
          title="Edit User"
          user={editingUser}
          onSubmit={(updates) => handleUpdateUser(editingUser.id, updates)}
          onClose={() => setEditingUser(null)}
          loading={loading}
          open={!!editingUser}
        />
      )}
    </div>
  );
}
