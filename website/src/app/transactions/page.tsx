import { TransactionsPage } from '@/src/components/pages';
import { AdminRoute } from '@/src/components/routes';

export default function Transactions() {
  return (
    <AdminRoute>
      <TransactionsPage />
    </AdminRoute>
  );
}

