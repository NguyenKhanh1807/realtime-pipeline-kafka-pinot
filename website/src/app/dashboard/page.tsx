'use client';

import { DashboardPage } from '@/src/components/pages';
import { AdminRoute } from '@/src/components/routes';

export default function Dashboard() {
  return (
    <AdminRoute>
      <DashboardPage />
    </AdminRoute>
  );
}