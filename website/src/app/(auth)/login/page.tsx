import { LoginPage } from '@/src/components/pages';
import { ProtectedRoute } from '@/src/components/routes';

export default function Login() {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
      <LoginPage />
    </ProtectedRoute>
  );
}
