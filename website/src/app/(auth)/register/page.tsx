import { RegisterPage } from '@/src/components/pages';
import { ProtectedRoute } from '@/src/components/routes';

export default function Register() {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
      <RegisterPage />
    </ProtectedRoute>
  );
}
