'use client';

import { Button, RoleBadge, Typography } from '@/src/components/atoms';
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
  className?: string;
}

export function UserTableRow({
  user,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  className,
}: UserTableRowProps) {
  return (
    <tr className={cn('transition-colors duration-150 hover:bg-muted/50 group', className)}>
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
              <User className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="span" size="sm" weight="semibold" className="text-foreground block truncate">
              {user.username}
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
        <div className="flex items-center justify-end space-x-1.5">
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

          {canDelete && user.username !== currentUser.username && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user.username)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={`Delete user ${user.username}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

