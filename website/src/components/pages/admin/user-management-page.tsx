'use client';

import { DashboardTemplate } from '@/src/components/templates';
import { UserManagement } from '@/src/components/organisms';
import { useUser } from '@/src/contexts/app-context';
import { ROLE_DEFINITIONS, type User as UserType } from '@/src/types';

export default function UserManagementPage() {
  const user = useUser();

  // Convert app-store User to auth User type
  const currentUser: UserType = {
    id: user?.id || 'admin-user',
    username: user?.username || 'admin-user',
    component: user?.component || 'admin',
    role: (user?.role === 'admin' ? 'admin' : 'user') as UserType['role'],
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

