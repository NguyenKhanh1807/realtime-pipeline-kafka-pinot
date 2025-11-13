'use client';

import { useMemo } from 'react';
import { DashboardTemplate } from '@/src/components/templates';
import { Typography, UserAvatar, RoleBadge, UserStatusBadge } from '@/src/components/atoms';
import { useUserDisplayName, useUser } from '@/src/contexts/app-context';
import { Mail, Shield, User, CheckCircle2, Building2, Activity, Key } from 'lucide-react';
import { cn } from '@/src/lib';
import type { UserRole } from '@/src/types';

interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}

function InfoCard({ icon: Icon, label, value, className }: InfoCardProps) {
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-xl border border-border bg-card p-6',
      'transition-all duration-200 hover:shadow-lg hover:border-primary/20',
      'hover:-translate-y-0.5',
      className
    )}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="p" size="xs" weight="medium" className="text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </Typography>
          <Typography variant="p" size="base" weight="semibold" className="text-foreground truncate">
            {value}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const userDisplayName = useUserDisplayName();
  const user = useUser();

  const userInitials = useMemo(() => {
    const parts = userDisplayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return userDisplayName.slice(0, 2).toUpperCase();
  }, [userDisplayName]);

  const userRole = user?.role || 'user';

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" />
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              {/* Large Avatar */}
              <div className="relative">
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl flex items-center justify-center text-4xl md:text-5xl font-bold text-primary-foreground ring-4 ring-background">
                    {userInitials}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1.5 shadow-lg border-2 border-background">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
                      {userDisplayName}
                    </Typography>
                    <UserStatusBadge isActive={true} />
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={userRole as UserRole} />
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground capitalize">
                      {userRole}
                    </Typography>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span>Active Session</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>Fraud Detection Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoCard
            icon={Mail}
            label="Email Address"
            value={user?.email || 'demo@example.com'}
          />

          <InfoCard
            icon={Shield}
            label="Account Role"
            value={userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          />

          <InfoCard
            icon={Building2}
            label="Organization"
            value="Fraud Detection System"
          />
        </div>
      </div>
    </DashboardTemplate>
  );
}
