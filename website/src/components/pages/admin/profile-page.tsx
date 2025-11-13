'use client';

import { DashboardTemplate } from '@/src/components/templates';
import { Typography } from '@/src/components/atoms';
import { useUserDisplayName, useUser } from '@/src/contexts/app-context';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const userDisplayName = useUserDisplayName();
  const user = useUser();

  const getUserInitials = () => {
    if (user?.name) {
      const { first, last } = user.name;
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return userDisplayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {getUserInitials()}
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
                  {userDisplayName}
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  {user?.role || 'User'}
                </Typography>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Email
                    </Typography>
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                      {user?.email || 'demo@example.com'}
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Role
                    </Typography>
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                      {user?.role || 'User'}
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Member Since
                    </Typography>
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Typography variant="p" size="sm" weight="medium" className="text-foreground">
                      Status
                    </Typography>
                    <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                      Active
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardTemplate>
  );
}
