import { ProfilePage } from '@/src/components/pages';
import { ProtectedRoute } from '@/src/components/routes';

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}