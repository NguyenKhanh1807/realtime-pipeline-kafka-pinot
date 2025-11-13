import { UserManagementPage } from '@/src/components/pages';
import { AdminRoute } from '@/src/components/routes';

export default function UserManagement() {
  return (
    <AdminRoute>
      <UserManagementPage />
    </AdminRoute>
  );
}

