'use client';

import { useState, useEffect } from 'react';
import { Button, Typography } from '@/src/components/atoms';
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
  hasPermission,
  canManageRole
} from '@/src/types';
import { websiteApiClient, type ApiUser } from '@/src/services';
import { UserPlus } from 'lucide-react';

interface UserManagementProps {
  currentUser: UserType;
  onUserCreate?: (user: Partial<UserType>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<UserType>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
  className?: string;
}

// Mock user data - in real app, this would come from API
const mockUsers: UserType[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: { first: 'Admin', last: 'User' },
    role: 'admin',
    permissions: ROLE_DEFINITIONS.admin.permissions,
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'analyst@company.com',
    name: { first: 'Fraud', last: 'Analyst' },
    role: 'analyst',
    permissions: ROLE_DEFINITIONS.analyst.permissions,
    isActive: true,
    lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  },
  {
    id: '3',
    email: 'viewer@company.com',
    name: { first: 'Report', last: 'Viewer' },
    role: 'viewer',
    permissions: ROLE_DEFINITIONS.viewer.permissions,
    isActive: true,
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
  },
];

export function UserManagement({
  currentUser,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  className
}: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);

  // Load users from API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setApiLoading(true);
        const response = await websiteApiClient.getUsers();

        if (response.success && response.data) {
          // Transform API users to component format
          const transformedUsers: UserType[] = Object.values(response.data.users).map((apiUser: ApiUser) => {
            const userRole = apiUser.role.toLowerCase() as UserRole;
            return {
              id: apiUser.username,
              email: apiUser.username, // Using username as email
              name: {
                first: apiUser.username.split('_')[0] || 'User',
                last: apiUser.component,
              },
              role: userRole,
              permissions: ROLE_DEFINITIONS[userRole]?.permissions || [], // Use role-based permissions
              isActive: true, // API doesn't provide this, assume active
              lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Mock login time
              createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Mock creation time
              updatedAt: new Date(),
            };
          });

          setUsers(transformedUsers);
        } else {
          // Fallback to mock data if API fails
          console.warn('Failed to load users from API, using mock data');
          setUsers(mockUsers);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        // Fallback to mock data
        setUsers(mockUsers);
      } finally {
        setApiLoading(false);
      }
    };

    loadUsers();
  }, []);

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
    return hasPermission(currentUser, 'users:update') && canManageRole(currentUser.role, user.role);
  };

  const canDeleteUser = (user: UserType) => {
    return hasPermission(currentUser, 'users:delete') && canManageRole(currentUser.role, user.role);
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
        <UserStatsCards users={users} isLoading={apiLoading} />
      </div>

      {/* Filters */}
      <UserFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={() => {
          setSearchTerm('');
          setRoleFilter('all');
          setStatusFilter('all');
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
        formatDate={formatDate}
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
