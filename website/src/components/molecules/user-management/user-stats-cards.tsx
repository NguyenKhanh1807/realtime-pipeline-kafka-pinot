'use client';

import { Typography } from '@/src/components/atoms';
import { Users, Crown, Shield } from 'lucide-react';
import type { User as UserType } from '@/src/types';

export interface UserStatsCardsProps {
  users: UserType[];
  isLoading?: boolean;
  className?: string;
}

export function UserStatsCards({ users, isLoading = false, className }: UserStatsCardsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const admins = users.filter(u => u.role === 'admin').length;
  const analysts = users.filter(u => u.role === 'analyst').length;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className || ''}`}>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Total Users
          </Typography>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="h3" size="xl" weight="bold" className="text-foreground">
          {isLoading ? '...' : totalUsers}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Active Users
          </Typography>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
        <Typography variant="h3" size="xl" weight="bold" className="text-foreground">
          {isLoading ? '...' : activeUsers}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Admins
          </Typography>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="h3" size="xl" weight="bold" className="text-foreground">
          {isLoading ? '...' : admins}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Analysts
          </Typography>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="h3" size="xl" weight="bold" className="text-foreground">
          {isLoading ? '...' : analysts}
        </Typography>
      </div>
    </div>
  );
}

