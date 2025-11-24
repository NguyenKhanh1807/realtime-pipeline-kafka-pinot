import { UserCheckoutPage } from '@/src/components/pages';
import { ProtectedRoute } from '@/src/components/routes';

export default function Checkout() {
  return (
    <ProtectedRoute>
      <UserCheckoutPage />
    </ProtectedRoute>
  );
}

