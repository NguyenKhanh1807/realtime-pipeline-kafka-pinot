import { TransactionPage as FraudDetectionPageComponent } from '@/src/components/pages';
import { AdminRoute } from '@/src/components/routes';

export default function FraudDetectionPage() {
  return (
    <AdminRoute>
      <FraudDetectionPageComponent />
    </AdminRoute>
  );
}

