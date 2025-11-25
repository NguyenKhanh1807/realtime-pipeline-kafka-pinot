'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { Typography } from '@/src/components/atoms/typography';
import { cn } from '@/src/lib/utils';
import type {
  User as UserType,
  UserRole
} from '@/src/types/auth';
import {
  ROLE_DEFINITIONS,
  hasPermission,
  canManageRole
} from '@/src/types/auth';
import {
  Users,
  User,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Search,
  X,
  Crown,
  Eye
} from 'lucide-react';

interface UserManagementProps {
  currentUser: UserType;
  onUserCreate?: (user: Partial<UserType>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<UserType>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
  className?: string;
}

// User data will be loaded from API - no mock data
export function UserManagement({
  currentUser,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  className
}: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserType | null>(null);

  // Load users from API (placeholder for real implementation)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call to load users from database
        // const response = await fetch('/api/users');
        // const userData = await response.json();
        // setUsers(userData);
        
        // For now, show empty state
        setUsers([]);
      } catch (error) {
        console.error('Failed to load users:', error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);
  const [loading, setLoading] = useState(false);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.name.first} ${user.name.last}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = async (userData: Partial<UserType>) => {
    if (!hasPermission(currentUser, 'users:create')) return;

    setLoading(true);
    try {
      const newUser: UserType = {
        id: Date.now().toString(),
        email: userData.email!,
        name: userData.name!,
        role: userData.role!,
        permissions: ROLE_DEFINITIONS[userData.role!].permissions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setUsers(prev => [...prev, newUser]);
      await onUserCreate?.(newUser);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserType>) => {
    if (!hasPermission(currentUser, 'users:update')) return;

    setLoading(true);
    try {
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, ...updates, permissions: ROLE_DEFINITIONS[updates.role!]?.permissions || user.permissions, updatedAt: new Date() }
          : user
      ));
      await onUserUpdate?.(userId, updates);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!hasPermission(currentUser, 'users:delete')) return;
    if (!confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      setUsers(prev => prev.filter(user => user.id !== userId));
      await onUserDelete?.(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'analyst': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-green-600" />;
      case 'api_user': return <Users className="h-4 w-4 text-purple-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
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

  return (
    <div className={cn('bg-card border border-border rounded-lg', className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
              User Management
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </Typography>
          </div>

          {hasPermission(currentUser, 'users:create') && (
            <Button onClick={() => setShowCreateForm(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
              Total Users
            </Typography>
            <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
              {users.length}
            </Typography>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
              Active Users
            </Typography>
            <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
              {users.filter(u => u.isActive).length}
            </Typography>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
              Admins
            </Typography>
            <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
              {users.filter(u => u.role === 'admin').length}
            </Typography>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
              Analysts
            </Typography>
            <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
              {users.filter(u => u.role === 'analyst').length}
            </Typography>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Roles</option>
            {Object.values(ROLE_DEFINITIONS).map(role => (
              <option key={role.name} value={role.name}>
                {role.displayName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setRoleFilter('all');
            setStatusFilter('all');
          }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                  User
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                  Role
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                  Status
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                  Last Login
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                  Actions
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                        {user.name.first} {user.name.last}
                      </Typography>
                      <Typography variant="span" size="sm" color="muted" className="text-muted-foreground block">
                        {user.email}
                      </Typography>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <Typography variant="span" size="sm" className="capitalize">
                      {ROLE_DEFINITIONS[user.role].displayName}
                    </Typography>
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    user.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900'
                      : 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900'
                  )}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <Typography variant="span" size="sm" className="text-muted-foreground">
                    {formatDate(user.lastLogin)}
                  </Typography>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    {hasPermission(currentUser, 'users:update') &&
                     canManageRole(currentUser.role, user.role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    {hasPermission(currentUser, 'users:delete') &&
                     canManageRole(currentUser.role, user.role) &&
                     user.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <Typography variant="h3" size="lg" color="muted" className="text-muted-foreground">
              No users found
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              Try adjusting your search or filters
            </Typography>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <UserFormModal
          title="Create User"
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserFormModal
          title="Edit User"
          user={editingUser}
          onSubmit={(updates) => handleUpdateUser(editingUser.id, updates)}
          onClose={() => setEditingUser(null)}
          loading={loading}
        />
      )}
    </div>
  );
}

// User Form Modal Component
interface UserFormModalProps {
  title: string;
  user?: UserType;
  onSubmit: (user: Partial<UserType>) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function UserFormModal({ title, user, onSubmit, onClose, loading }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.name.first || '',
    lastName: user?.name.last || '',
    role: user?.role || 'viewer' as UserRole,
    isActive: user?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      email: formData.email,
      name: { first: formData.firstName, last: formData.lastName },
      role: formData.role,
      isActive: formData.isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <Typography variant="h2" size="lg" weight="semibold" className="text-foreground">
            {title}
          </Typography>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              {Object.values(ROLE_DEFINITIONS).map(role => (
                <option key={role.name} value={role.name}>
                  {role.displayName}
                </option>
              ))}
            </select>
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
