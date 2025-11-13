'use client';

import { Button, RoleBadge, UserStatusBadge, Typography } from '@/src/components/atoms';
import { ROLE_DEFINITIONS, type User as UserType } from '@/src/types';
import { Edit, Trash2, User } from 'lucide-react';
import { cn } from '@/src/lib';

export interface UserTableRowProps {
  user: UserType;
  currentUser: UserType;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (user: UserType) => void;
  onDelete: (userId: string) => void;
  formatDate: (date: Date | undefined) => string;
  className?: string;
}

export function UserTableRow({
  user,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  formatDate,
  className,
}: UserTableRowProps) {
  const getUserInitials = () => {
    const { first, last } = user.name;
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const getRelativeTime = (date: Date | undefined) => {
    if (!date) return null;
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''} ago` : 'Just now';
  };

  return (
    <tr className={cn('transition-colors duration-150 hover:bg-muted/50 group', className)}>
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
              <User className="h-5 w-5 text-primary" />
            </div>
            {user.isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="span" size="sm" weight="semibold" className="text-foreground block truncate">
              {user.name.first} {user.name.last}
            </Typography>
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block truncate">
              {user.email}
            </Typography>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-2">
          <RoleBadge role={user.role} />
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            {ROLE_DEFINITIONS[user.role].displayName}
          </Typography>
        </div>
      </td>
      <td className="p-4">
        <UserStatusBadge isActive={user.isActive} />
      </td>
      <td className="p-4">
        <div className="flex flex-col">
          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
            {formatDate(user.lastLogin)}
          </Typography>
          {user.lastLogin && (
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground mt-0.5">
              {getRelativeTime(user.lastLogin)}
            </Typography>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-1.5">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
              title="Edit user"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}

          {canDelete && user.id !== currentUser.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

