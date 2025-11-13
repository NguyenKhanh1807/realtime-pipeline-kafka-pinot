'use client';

import { Typography, Button } from '@/src/components/atoms';
import { UserTableRow } from './user-table-row';
import { Users, UserPlus } from 'lucide-react';
import type { User as UserType } from '@/src/types';

export interface UserTableProps {
  users: UserType[];
  currentUser: UserType;
  canEdit: (user: UserType) => boolean;
  canDelete: (user: UserType) => boolean;
  onEdit: (user: UserType) => void;
  onDelete: (userId: string) => void;
  onCreateFirst?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function UserTable({
  users,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onCreateFirst,
  isLoading = false,
  className,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className={`p-12 text-center border-t border-border ${className || ''}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-2">
          Loading users...
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Fetching user data from API
        </Typography>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`p-12 text-center border-t border-border ${className || ''}`}>
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-2">
          No users found
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-4">
          Try adjusting your search or filters to find users
        </Typography>
        {onCreateFirst && currentUser.role === 'admin' && (
          <Button onClick={onCreateFirst} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className='mb-0.5 text-xs'>Create First User</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className || ''}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left p-4">
              <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                User
              </Typography>
            </th>
            <th className="text-left p-4">
              <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                Role
              </Typography>
            </th>
            <th className="text-right p-4">
              <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                Actions
              </Typography>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {users.map((user) => (
            <UserTableRow
              key={user.username}
              user={user}
              currentUser={currentUser}
              canEdit={canEdit(user)}
              canDelete={canDelete(user)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

