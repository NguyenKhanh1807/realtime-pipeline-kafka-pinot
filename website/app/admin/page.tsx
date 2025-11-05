'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { AuditLogViewer } from '@/src/components/organisms/audit-log-viewer';
import { UserManagement } from '@/src/components/organisms/user-management';
import { User } from '@/src/types/auth';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { useUserDisplayName, useIsAuthenticated, useIsAdmin } from '@/src/contexts/app-context';
import { ArrowLeft, Shield, Users, Settings, BarChart3 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const userDisplayName = useUserDisplayName();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated || !isAdmin) {
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
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <Typography variant="h1" size="3xl" weight="bold" className="text-foreground">
                Admin Dashboard
              </Typography>
              <Typography variant="p" size="base" color="muted" className="text-muted-foreground mt-1">
                System administration and audit logging
              </Typography>
            </div>
          </div>
        </div>

        {/* Admin Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Button
            variant="outline"
            className="p-6 h-auto flex-col items-start space-y-2"
            onClick={() => document.getElementById('user-management')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Users className="h-8 w-8 text-blue-600" />
            <div className="text-left">
              <Typography variant="span" weight="semibold" className="text-foreground">
                User Management
              </Typography>
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground block">
                Manage users and roles
              </Typography>
            </div>
          </Button>

          <Button
            variant="outline"
            className="p-6 h-auto flex-col items-start space-y-2"
            onClick={() => document.getElementById('audit-logs')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Shield className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <Typography variant="span" weight="semibold" className="text-foreground">
                Audit Logs
              </Typography>
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground block">
                View system activity
              </Typography>
            </div>
          </Button>

          <Button variant="outline" className="p-6 h-auto flex-col items-start space-y-2">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <Typography variant="span" weight="semibold" className="text-foreground">
                System Analytics
              </Typography>
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground block">
                Performance metrics
              </Typography>
            </div>
          </Button>

          <Button variant="outline" className="p-6 h-auto flex-col items-start space-y-2">
            <Settings className="h-8 w-8 text-orange-600" />
            <div className="text-left">
              <Typography variant="span" weight="semibold" className="text-foreground">
                System Settings
              </Typography>
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground block">
                Configure application
              </Typography>
            </div>
          </Button>
        </div>

        {/* User Management Section */}
        <div id="user-management" className="space-y-6">
          <div>
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
              User Management
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </Typography>
          </div>

          <UserManagement
            currentUser={{
              id: 'admin-user',
              email: 'admin@company.com',
              name: { first: 'Admin', last: 'User' },
              role: 'admin',
              permissions: [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
          />
        </div>

        {/* Audit Logs Section */}
        <div id="audit-logs" className="space-y-6">
          <div>
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
              Audit Logs
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              Comprehensive activity tracking with OpenTelemetry correlation IDs
            </Typography>
          </div>

          <AuditLogViewer showFilters={true} maxHeight="800px" />
        </div>
      </div>
    </DashboardLayout>
  );
}
