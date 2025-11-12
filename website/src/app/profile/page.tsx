'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/src/components/layouts/dashboard-layout';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { useIsAuthenticated, useUserDisplayName, useUser } from '@/src/contexts/app-context';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const userDisplayName = useUserDisplayName();
  const user = useUser();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const getUserInitials = () => {
    if (user?.name) {
      const { first, last } = user.name;
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return userDisplayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h1" size="3xl" weight="bold" className="text-foreground">
              Profile Settings
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground mt-1">
              Manage your account settings and preferences.
            </Typography>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Dashboard
          </Button>
        </div>

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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1">
            Edit Profile
          </Button>
          <Button variant="outline" className="flex-1">
            Change Password
          </Button>
          <Button variant="outline" className="flex-1">
            Notification Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
