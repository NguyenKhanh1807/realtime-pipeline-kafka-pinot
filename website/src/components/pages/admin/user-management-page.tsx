'use client';

import { DashboardTemplate } from '@/src/components/templates';
import { PageHeader } from '@/src/components/molecules';
import { UserManagement } from '@/src/components/organisms';
import { useUser } from '@/src/contexts/app-context';
import { ROLE_DEFINITIONS, type User as UserType } from '@/src/types';

export default function UserManagementPage() {
  const user = useUser();

  // Convert app-store User to auth User type
  const currentUser: UserType = {
    id: user?.id || 'admin-user',
    email: user?.email || 'admin@company.com',
    name: user?.name || { first: 'Admin', last: 'User' },
    role: (user?.role === 'admin' ? 'admin' : user?.role === 'moderator' ? 'analyst' : 'viewer') as UserType['role'],
    permissions: user?.role === 'admin' ? ROLE_DEFINITIONS.admin.permissions : [],
    isActive: true,
    createdAt: user?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* User Management Component */}
        <UserManagement currentUser={currentUser} />
      </div>
    </DashboardTemplate>
  );
}

